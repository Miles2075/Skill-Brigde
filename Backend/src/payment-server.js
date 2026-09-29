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
const coursePricePaise = course => {
  const value = Number(course?.pricePaise ?? 49900)
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 49900
}
const previewSeconds = course => {
  const value = Number(course?.previewMinutes ?? 3)
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 60)) : 180
}
const enrollmentFor = (data, courseId, userId) => data.enrollments.find(e => e.courseId === courseId && e.userId === userId)

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

// Instructor controls the price and free-preview duration for their own courses.
app.patch('/api/courses/:id/settings', express.json(), auth, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') return res.status(403).json({ message: 'Only instructors can change course pricing' })
    const data = await read()
    const course = data.courses.find(item => item.id === req.params.id && item.instructorId === req.user.id)
    if (!course) return res.status(404).json({ message: 'Course not found or you do not own it' })

    const rawPrice = req.body.pricePaise != null ? Number(req.body.pricePaise) : Number(req.body.price)
    const rawMinutes = Number(req.body.previewMinutes)
    const pricePaise = req.body.pricePaise != null ? rawPrice : rawPrice * 100

    if (!Number.isFinite(pricePaise) || pricePaise < 0 || !Number.isInteger(pricePaise)) {
      return res.status(400).json({ message: 'Price must be a non-negative whole amount' })
    }
    if (!Number.isFinite(rawMinutes) || rawMinutes < 0 || rawMinutes > 120 || !Number.isInteger(rawMinutes)) {
      return res.status(400).json({ message: 'Preview must be between 0 and 120 whole minutes' })
    }

    course.pricePaise = pricePaise
    course.previewMinutes = rawMinutes
    course.updatedAt = new Date().toISOString()
    await save(data)
    res.json({ course })
  } catch (error) {
    console.error('Course settings error:', error)
    res.status(500).json({ message: 'Could not save course settings' })
  }
})

// Course player access: enrolled students get the complete course; unpaid students
// receive only the first lesson for the configured preview duration.
app.get('/api/courses/:id/player', auth, async (req, res) => {
  try {
    const data = await read()
    const course = data.courses.find(item => item.id === req.params.id)
    if (!course) return res.status(404).json({ message: 'Course not found' })

    const enrollment = enrollmentFor(data, course.id, req.user.id)
    const instructorOwner = req.user.role === 'instructor' && course.instructorId === req.user.id
    if (req.user.role === 'instructor' && !instructorOwner) return res.status(403).json({ message: 'You can only preview your own courses' })

    const lessons = data.lessons.filter(item => item.courseId === course.id).sort((a, b) => a.order - b.order)
    const paid = coursePricePaise(course) > 0
    const enrolled = Boolean(enrollment) || instructorOwner

    if (!paid || enrolled) {
      return res.json({ course, lessons, enrolled, preview: false, previewSeconds: 0 })
    }

    const firstLesson = lessons.slice(0, 1)
    return res.json({
      course,
      lessons: firstLesson,
      enrolled: false,
      preview: true,
      previewSeconds: previewSeconds(course),
      message: 'Free preview only. Purchase the course to unlock all lessons.',
    })
  } catch (error) {
    console.error('Course player error:', error)
    res.status(500).json({ message: 'Could not load course player' })
  }
})

app.post('/api/create-order', express.json(), auth, async (req, res) => {
  try {
    if (!razorpay) return res.status(500).json({ message: 'Razorpay is not configured. Add the test keys to Backend/.env' })
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students can purchase courses' })

    const data = await read()
    const courseId = String(req.body.courseId || '').trim()
    const courseTitle = String(req.body.courseTitle || '').trim()
    const course = data.courses.find(item => item.id === courseId || (!courseId && item.title === courseTitle))

    if (!course) return res.status(404).json({ message: 'Course not found' })
    if (!course.published) return res.status(400).json({ message: 'This course is not published yet' })
    if (enrollmentFor(data, course.id, req.user.id)) return res.status(409).json({ message: 'Already enrolled' })

    const amount = coursePricePaise(course)
    if (amount === 0) return res.status(400).json({ message: 'This course is free. Use the free enrollment action.' })
    if (!Number.isInteger(amount) || amount < 100) return res.status(400).json({ message: 'Course price must be at least 100 paise' })

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
      course: { id: course.id, title: course.title, pricePaise: amount, previewMinutes: Number(course.previewMinutes ?? 3) },
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
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId) return res.status(400).json({ message: 'Missing payment verification fields' })
    if (!razorpay) return res.status(500).json({ message: 'Razorpay is not configured' })
    if (!KEY_SECRET) return res.status(500).json({ message: 'Razorpay secret is not configured' })
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students can purchase courses' })

    const data = await read()
    const course = data.courses.find(item => item.id === String(courseId))
    if (!course) return res.status(404).json({ message: 'Course not found' })
    if (!course.published) return res.status(400).json({ message: 'This course is not published yet' })
    if (enrollmentFor(data, course.id, req.user.id)) return res.json({ success: true, alreadyEnrolled: true })

    const expected = crypto.createHmac('sha256', KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex')
    const supplied = String(razorpay_signature)
    const valid = supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
    if (!valid) return res.status(400).json({ message: 'Payment signature verification failed' })

    const order = await razorpay.orders.fetch(razorpay_order_id)
    const expectedAmount = coursePricePaise(course)
    const orderCourseId = String(order?.notes?.courseId || '')
    const orderUserId = String(order?.notes?.userId || '')
    if (orderCourseId !== course.id || orderUserId !== req.user.id) return res.status(400).json({ message: 'Payment order does not match this student and course' })
    if (Number(order.amount) !== expectedAmount || String(order.currency) !== 'INR') return res.status(400).json({ message: 'Payment amount does not match the course price' })
    if (order.status !== 'paid') return res.status(400).json({ message: 'Payment order has not been paid' })

    const payment = await razorpay.payments.fetch(razorpay_payment_id)
    if (!payment || payment.order_id !== razorpay_order_id) return res.status(400).json({ message: 'Payment does not belong to the verified order' })
    if (payment.status !== 'captured') return res.status(400).json({ message: `Payment is not captured (status: ${payment.status || 'unknown'})` })
    if (Number(payment.amount) !== expectedAmount || String(payment.currency) !== 'INR') return res.status(400).json({ message: 'Captured payment amount does not match the course price' })

    const paidAt = new Date().toISOString()
    const enrollment = {
      id: uuid(), userId: req.user.id, courseId: course.id, progress: 0, completedLessons: 0,
      completedLessonIds: [], lastLessonId: null, status: 'not_started', paid: true,
      razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, paidAt,
    }
    data.enrollments.push(enrollment)
    if (!Array.isArray(data.payments)) data.payments = []
    data.payments.push({ id: uuid(), userId: req.user.id, courseId: course.id, orderId: razorpay_order_id, paymentId: razorpay_payment_id, amountPaise: expectedAmount, status: 'paid', createdAt: paidAt })
    await save(data)
    res.json({ success: true, enrollment })
  } catch (error) {
    console.error('Razorpay verify-payment error:', error?.error?.description || error?.message || error)
    res.status(error?.statusCode === 401 ? 401 : 400).json({ message: error?.error?.description || 'Payment verification failed' })
  }
})

// Paid courses cannot be enrolled through the old direct route. Free courses can.
app.post('/api/courses/:id/enroll', express.json(), auth, async (req, res, next) => {
  if (req.user.role === 'student') {
    const data = await read()
    const course = data.courses.find(item => item.id === req.params.id)
    if (course && coursePricePaise(course) > 0) return res.status(402).json({ message: 'Payment required. Use the course Enroll button to complete checkout.' })
  }
  next()
})

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
