import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Razorpay from 'razorpay'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import jwt from 'jsonwebtoken'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { v4 as uuid } from 'uuid'

dotenv.config()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'data.json')
const PORT = Number(process.env.PORT || 5000)
const INTERNAL_PORT = Number(process.env.INTERNAL_BACKEND_PORT || 5001)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const KEY_ID = process.env.RAZORPAY_KEY_ID
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
const razorpay = KEY_ID && KEY_SECRET ? new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET }) : null
const app = express()

app.use(cors({ origin: true, credentials: true }))

const read = async () => JSON.parse(await fs.readFile(DATA_FILE, 'utf8'))
const save = data => fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) throw new Error()
    const payload = jwt.verify(header.slice(7), JWT_SECRET)
    const data = await read()
    const user = data.users.find(item => item.id === payload.sub)
    if (!user) throw new Error()
    req.user = user
    next()
  } catch {
    res.status(401).json({ message: 'Authentication required' })
  }
}

app.post('/api/create-order', express.json(), auth, async (req, res) => {
  try {
    if (!razorpay) return res.status(500).json({ message: 'Razorpay is not configured. Add the test keys to Backend/.env' })

    const data = await read()
    const courseId = String(req.body.courseId || '').trim()
    const courseTitle = String(req.body.courseTitle || '').trim()
    const course = data.courses.find(item => item.id === courseId || item.title === courseTitle)

    if (!course) return res.status(404).json({ message: 'Course not found' })
    if (!course.published) return res.status(400).json({ message: 'This course is not published yet' })
    if (data.enrollments.some(e => e.userId === req.user.id && e.courseId === course.id)) {
      return res.status(409).json({ message: 'Already enrolled' })
    }

    // Existing demo courses do not have a price field yet, so use ₹499 by default.
    // When pricePaise is added to a course, that value becomes authoritative.
    const amount = Math.round(Number(course.pricePaise ?? 49900))
    if (!Number.isInteger(amount) || amount < 100) {
      return res.status(400).json({ message: 'Course price must be at least 100 paise' })
    }

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `skillbridge_${course.id}_${Date.now()}`.slice(0, 40),
      notes: { courseId: course.id, userId: req.user.id },
    })

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      course: { id: course.id, title: course.title },
      user: { name: req.user.name, email: req.user.email },
    })
  } catch (error) {
    const status = error?.statusCode === 401 || error?.statusCode === 403 ? 401 : 500
    console.error('Razorpay create-order error:', error?.error?.description || error?.message || error)
    res.status(status).json({ message: error?.error?.description || 'Could not create Razorpay order' })
  }
})

app.post('/api/verify-payment', express.json(), auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body || {}
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId) {
      return res.status(400).json({ message: 'Missing payment verification fields' })
    }
    if (!KEY_SECRET) return res.status(500).json({ message: 'Razorpay secret is not configured' })

    const expected = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')
    const supplied = String(razorpay_signature)
    const valid = supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))

    if (!valid) return res.status(400).json({ message: 'Payment signature verification failed' })

    const data = await read()
    const course = data.courses.find(item => item.id === courseId)
    if (!course) return res.status(404).json({ message: 'Course not found' })
    if (data.enrollments.some(e => e.userId === req.user.id && e.courseId === courseId)) {
      return res.json({ success: true, alreadyEnrolled: true })
    }

    const paidAt = new Date().toISOString()
    const enrollment = {
      id: uuid(),
      userId: req.user.id,
      courseId,
      progress: 0,
      completedLessons: 0,
      completedLessonIds: [],
      lastLessonId: null,
      status: 'not_started',
      paid: true,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paidAt,
    }
    data.enrollments.push(enrollment)

    if (!Array.isArray(data.payments)) data.payments = []
    data.payments.push({
      id: uuid(),
      userId: req.user.id,
      courseId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amountPaise: Number(course.pricePaise ?? 49900),
      status: 'paid',
      createdAt: paidAt,
    })

    await save(data)
    res.json({ success: true, enrollment })
  } catch (error) {
    console.error('Razorpay verify-payment error:', error?.message || error)
    res.status(400).json({ message: 'Payment verification failed' })
  }
})

// Keep the existing Skillbridge API and video uploads working on the same port.
const proxy = createProxyMiddleware({ target: `http://127.0.0.1:${INTERNAL_PORT}`, changeOrigin: true })
app.use('/api', proxy)
app.use('/uploads', proxy)

const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  env: { ...process.env, PORT: String(INTERNAL_PORT) },
  stdio: 'inherit',
})
child.on('exit', code => {
  if (code && code !== 0) process.exit(code)
})

const server = app.listen(PORT, () => {
  console.log(`Skillbridge API + Razorpay running at http://localhost:${PORT}`)
})

function shutdown() {
  server.close(() => child.kill('SIGTERM'))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
