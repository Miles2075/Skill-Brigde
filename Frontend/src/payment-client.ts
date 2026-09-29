let razorpayPromise: Promise<void> | null = null
let previewState: { active: boolean; seconds: number; courseId: string; title: string } | null = null
let previewOverlay: HTMLDivElement | null = null
let previewVideo: HTMLVideoElement | null = null
let previewTimer: number | null = null

function token() {
  return localStorage.getItem('skillbridge_token')
}

async function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve()
  if (razorpayPromise) return razorpayPromise
  razorpayPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Could not load Razorpay Checkout')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout'))
    document.head.appendChild(script)
  })
  return razorpayPromise
}

async function getPublishedCourse(title: string) {
  const response = await fetch(`/api/courses?search=${encodeURIComponent(title)}`)
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Could not find course')
  const courses = Array.isArray(data.courses) ? data.courses : []
  return courses.find((c: any) => String(c.title).trim().toLowerCase() === title.trim().toLowerCase()) || courses[0]
}

async function startPayment(courseId: string, courseTitle: string) {
  const auth = token()
  const createResponse = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    body: JSON.stringify({ courseId, courseTitle }),
  })
  const order = await createResponse.json()

  // Free courses use the normal enrollment route and never open Razorpay.
  if (!createResponse.ok && createResponse.status === 400 && String(order.message || '').toLowerCase().includes('free')) {
    const freeResponse = await fetch(`/api/courses/${encodeURIComponent(courseId)}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    })
    const freeResult = await freeResponse.json()
    if (!freeResponse.ok) throw new Error(freeResult.message || 'Could not enroll in free course')
    window.alert('Course enrolled successfully!')
    window.location.reload()
    return
  }

  if (!createResponse.ok) throw new Error(order.message || 'Could not create payment order')
  await loadRazorpayScript()
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID
  if (!key) throw new Error('VITE_RAZORPAY_KEY_ID is missing from Frontend/.env')
  const Razorpay = window.Razorpay
  if (!Razorpay) throw new Error('Razorpay Checkout did not load')

  const options = {
    key,
    amount: order.amount,
    currency: order.currency,
    name: 'Skillbridge',
    description: order.course.title,
    order_id: order.order_id,
    prefill: { name: order.user?.name || '', email: order.user?.email || '' },
    theme: { color: '#4f46e5' },
    handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
      const verifyResponse = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
        body: JSON.stringify({ ...response, courseId: order.course.id }),
      })
      const result = await verifyResponse.json()
      if (!verifyResponse.ok || !result.success) throw new Error(result.message || 'Payment verification failed')
      window.alert('Payment successful! Your course is now unlocked.')
      window.location.reload()
    },
    modal: { ondismiss: () => window.alert('Payment cancelled. Your course is still locked.') },
  }
  const checkout = new Razorpay(options)
  checkout.on('payment.failed', (response: any) => window.alert(`Payment failed: ${response?.error?.description || 'Please try again.'}`))
  checkout.open()
}

async function startPaymentFromCard(button: HTMLButtonElement) {
  const card = button.closest('div.rounded-2xl') || button.closest('article') || button.parentElement?.parentElement
  const title = card?.querySelector('h2, h3')?.textContent?.trim()
  if (!title) throw new Error('Could not identify the course')
  const course = await getPublishedCourse(title)
  if (!course?.id) throw new Error('Could not identify the course')
  await startPayment(course.id, course.title)
}

function removePreviewOverlay() {
  if (previewTimer) window.clearInterval(previewTimer)
  previewTimer = null
  previewOverlay?.remove()
  previewOverlay = null
  previewVideo = null
}

function showPreviewOverlay() {
  if (previewOverlay || !previewState) return
  previewOverlay = document.createElement('div')
  previewOverlay.style.cssText = 'position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,.82);backdrop-filter:blur(6px);padding:24px;text-align:center;color:white'
  previewOverlay.innerHTML = `
    <div style="max-width:430px;width:100%;background:rgba(15,23,42,.96);border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:28px;box-shadow:0 25px 80px rgba(0,0,0,.45)">
      <div style="font-size:38px">🔒</div>
      <h2 style="font-size:24px;font-weight:800;margin-top:10px">Preview finished</h2>
      <p style="color:#cbd5e1;margin-top:8px">You've watched the free preview. Purchase this course to unlock all lessons.</p>
      <button data-preview-buy style="margin-top:20px;width:100%;padding:12px 18px;border:0;border-radius:12px;background:#4f46e5;color:white;font-weight:800;cursor:pointer">Buy Course</button>
    </div>`
  previewOverlay.querySelector('[data-preview-buy]')?.addEventListener('click', async () => {
    try {
      const buy = previewOverlay?.querySelector('[data-preview-buy]') as HTMLButtonElement | null
      if (buy) { buy.disabled = true; buy.textContent = 'Opening payment…' }
      await startPayment(previewState!.courseId, previewState!.title)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not start payment')
      const buy = previewOverlay?.querySelector('[data-preview-buy]') as HTMLButtonElement | null
      if (buy) { buy.disabled = false; buy.textContent = 'Buy Course' }
    }
  })
  const wrapper = previewVideo?.parentElement
  if (wrapper) {
    if (getComputedStyle(wrapper).position === 'static') wrapper.style.position = 'relative'
    wrapper.appendChild(previewOverlay)
  }
}

function enforcePreview(video: HTMLVideoElement) {
  if (!previewState?.active || previewState.seconds <= 0) return
  if (previewVideo === video) return
  removePreviewOverlay()
  previewVideo = video
  const limit = previewState.seconds
  const stopAtLimit = () => {
    if (!previewState?.active || !previewVideo) return
    if (previewVideo.currentTime >= limit) {
      previewVideo.currentTime = limit
      previewVideo.pause()
      showPreviewOverlay()
    }
  }
  video.addEventListener('timeupdate', stopAtLimit)
  video.addEventListener('seeking', () => {
    if (video.currentTime > limit) video.currentTime = limit
  })
  video.addEventListener('loadedmetadata', stopAtLimit)
  video.addEventListener('play', () => {
    if (video.currentTime >= limit) { video.pause(); showPreviewOverlay() }
  })
  const parent = video.parentElement
  if (parent && getComputedStyle(parent).position === 'static') parent.style.position = 'relative'
  if (video.currentTime >= limit) showPreviewOverlay()
}

function watchForPreviewVideo() {
  const video = document.querySelector('video') as HTMLVideoElement | null
  if (previewState?.active && video) enforcePreview(video)
  if (!previewState?.active && previewVideo) removePreviewOverlay()
}

// Inspect player responses without consuming the response used by the React app.
// If an older backend instance still returns 403 for an unpaid student, fall back
// to the public course payload and expose only the first lesson as a preview.
const originalFetch = window.fetch.bind(window)
window.fetch = async (...args: Parameters<typeof fetch>) => {
  let response = await originalFetch(...args)
  const input = args[0]
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''

  if (url.includes('/api/courses/') && url.endsWith('/player') && response.status === 403) {
    const match = url.match(/\/api\/courses\/([^/]+)\/player$/)
    if (match) {
      try {
        const headers = new Headers((args[1] as RequestInit | undefined)?.headers)
        const courseResponse = await originalFetch(`/api/courses/${encodeURIComponent(match[1])}`, { headers })
        if (courseResponse.ok) {
          const courseData = await courseResponse.json()
          const course = courseData.course
          const lessons = Array.isArray(courseData.lessons) ? courseData.lessons : []
          const seconds = Math.max(0, Math.round(Number(course?.previewMinutes ?? 3) * 60))
          response = new Response(JSON.stringify({
            course,
            lessons: lessons.slice(0, 1),
            enrolled: false,
            preview: true,
            previewSeconds: seconds || 180,
            message: 'Free preview only. Purchase the course to unlock all lessons.',
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      } catch {
        // Keep the original 403 response if the preview fallback cannot load.
      }
    }
  }

  if (url.includes('/api/courses/') && url.endsWith('/player')) {
    response.clone().json().then((data: any) => {
      if (data?.preview) {
        previewState = { active: true, seconds: Number(data.previewSeconds) || 180, courseId: String(data.course?.id || ''), title: String(data.course?.title || 'Course') }
      } else {
        previewState = null
        removePreviewOverlay()
      }
      setTimeout(watchForPreviewVideo, 50)
    }).catch(() => {})
  }
  return response
}

// Add a pricing button to the existing instructor course cards without replacing the existing UI.
async function addInstructorPricingButtons() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
  for (const editButton of buttons) {
    if (editButton.textContent?.trim() !== 'Edit Course' || editButton.dataset.skillbridgePricingAdded) continue
    editButton.dataset.skillbridgePricingAdded = '1'
    const pricingButton = document.createElement('button')
    pricingButton.type = 'button'
    pricingButton.textContent = '💳 Pricing & Preview'
    pricingButton.className = editButton.className.replace(/bg-slate-100/g, 'bg-purple-50').replace(/hover:bg-slate-200/g, 'hover:bg-purple-100').replace(/text-slate-700/g, 'text-purple-700')
    pricingButton.style.marginTop = '0'
    pricingButton.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      openPricingModal(editButton)
    })
    editButton.parentElement?.appendChild(pricingButton)
  }
}

async function openPricingModal(sourceButton: HTMLButtonElement) {
  const card = sourceButton.closest('article') || sourceButton.closest('div.rounded-2xl')
  const title = card?.querySelector('h2, h3')?.textContent?.trim()
  if (!title) return window.alert('Could not identify the course')
  const auth = token()
  const response = await fetch(`/api/instructor/course-settings?courseTitle=${encodeURIComponent(title)}`, { headers: auth ? { Authorization: `Bearer ${auth}` } : {} })
  const data = await response.json()
  if (!response.ok) return window.alert(data.message || 'Could not load course settings')
  const course = data.course

  const modal = document.createElement('div')
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(2,6,23,.6);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px'
  modal.innerHTML = `
    <div style="width:min(480px,100%);background:white;border-radius:24px;padding:24px;box-shadow:0 30px 100px rgba(0,0,0,.35)">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
        <div><div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#4f46e5">COURSE MONETIZATION</div><h2 style="font-size:22px;font-weight:800;margin-top:5px">${escapeHtml(course.title)}</h2></div>
        <button data-close style="border:0;background:#f1f5f9;border-radius:10px;width:36px;height:36px;font-size:18px;cursor:pointer">×</button>
      </div>
      <label style="display:block;margin-top:22px;font-weight:700;font-size:14px">Course price (₹)</label>
      <input data-price type="number" min="0" step="1" value="${Math.round(Number(course.pricePaise || 0) / 100)}" style="width:100%;margin-top:7px;border:1px solid #cbd5e1;border-radius:12px;padding:11px 13px;font-size:16px;box-sizing:border-box" />
      <label style="display:block;margin-top:16px;font-weight:700;font-size:14px">Free preview duration (minutes)</label>
      <input data-minutes type="number" min="0" max="120" step="1" value="${Number(course.previewMinutes ?? 3)}" style="width:100%;margin-top:7px;border:1px solid #cbd5e1;border-radius:12px;padding:11px 13px;font-size:16px;box-sizing:border-box" />
      <p style="font-size:12px;color:#64748b;margin-top:10px">Set price to ₹0 to make the course completely free. Preview duration applies only to unpaid students.</p>
      <button data-save style="width:100%;margin-top:20px;border:0;border-radius:12px;padding:12px;background:#4f46e5;color:white;font-weight:800;cursor:pointer">Save Pricing & Preview</button>
    </div>`
  document.body.appendChild(modal)
  const close = () => modal.remove()
  modal.querySelector('[data-close]')?.addEventListener('click', close)
  modal.addEventListener('click', e => { if (e.target === modal) close() })
  modal.querySelector('[data-save]')?.addEventListener('click', async () => {
    const price = Number((modal.querySelector('[data-price]') as HTMLInputElement).value)
    const minutes = Number((modal.querySelector('[data-minutes]') as HTMLInputElement).value)
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(price)) return window.alert('Enter a valid whole-number price')
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 120 || !Number.isInteger(minutes)) return window.alert('Preview must be 0–120 whole minutes')
    const saveButton = modal.querySelector('[data-save]') as HTMLButtonElement
    saveButton.disabled = true; saveButton.textContent = 'Saving…'
    try {
      const r = await fetch(`/api/courses/${encodeURIComponent(course.id)}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify({ pricePaise: Math.round(price * 100), previewMinutes: minutes }) })
      const result = await r.json()
      if (!r.ok) throw new Error(result.message || 'Could not save settings')
      window.alert(`Saved ✓\nPrice: ₹${price}\nFree preview: ${minutes} minute${minutes === 1 ? '' : 's'}`)
      close()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not save settings')
      saveButton.disabled = false; saveButton.textContent = 'Save Pricing & Preview'
    }
  })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char))
}

declare global {
  interface Window {
    Razorpay?: new (options: any) => { open: () => void; on: (event: string, callback: (response: any) => void) => void }
  }
}

document.addEventListener('click', async event => {
  const target = event.target as HTMLElement | null
  const button = target?.closest('button') as HTMLButtonElement | null
  if (!button || button.disabled || button.dataset.skillbridgePricingAdded || button.textContent?.trim() !== 'Enroll') return
  event.preventDefault()
  event.stopImmediatePropagation()
  button.disabled = true
  const original = button.textContent
  button.textContent = 'Opening payment…'
  try {
    await startPaymentFromCard(button)
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Could not start payment')
  } finally {
    button.disabled = false
    button.textContent = original || 'Enroll'
  }
}, true)

const observer = new MutationObserver(() => {
  addInstructorPricingButtons().catch(() => {})
  watchForPreviewVideo()
})
observer.observe(document.documentElement, { childList: true, subtree: true })
addInstructorPricingButtons().catch(() => {})

setInterval(() => {
  watchForPreviewVideo()
}, 500)
