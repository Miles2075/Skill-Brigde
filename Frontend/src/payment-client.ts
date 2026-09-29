let razorpayPromise: Promise<void> | null = null

function loadRazorpayScript() {
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

async function startPayment(button: HTMLButtonElement) {
  const card = button.closest('div.rounded-2xl') || button.parentElement?.parentElement
  const title = card?.querySelector('h2')?.textContent?.trim()
  if (!title) throw new Error('Could not identify the course')

  const token = localStorage.getItem('skillbridge_token')
  const createResponse = await fetch('/api/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ courseTitle: title }),
  })
  const order = await createResponse.json()
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
    prefill: {
      name: order.user?.name || '',
      email: order.user?.email || '',
    },
    theme: { color: '#4f46e5' },
    handler: async (response: {
      razorpay_payment_id: string
      razorpay_order_id: string
      razorpay_signature: string
    }) => {
      const verifyResponse = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...response, courseId: order.course.id }),
      })
      const result = await verifyResponse.json()
      if (!verifyResponse.ok || !result.success) {
        throw new Error(result.message || 'Payment verification failed')
      }
      window.alert('Payment successful! Your course is now unlocked.')
      window.location.reload()
    },
    modal: {
      ondismiss: () => window.alert('Payment cancelled. Your course is still locked.'),
    },
  }

  const checkout = new Razorpay(options)
  checkout.on('payment.failed', (response: any) => {
    window.alert(`Payment failed: ${response?.error?.description || 'Please try again.'}`)
  })
  checkout.open()
}

declare global {
  interface Window {
    Razorpay?: new (options: any) => {
      open: () => void
      on: (event: string, callback: (response: any) => void) => void
    }
  }
}

document.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement | null
  const button = target?.closest('button') as HTMLButtonElement | null
  if (!button || button.disabled || button.textContent?.trim() !== 'Enroll') return

  event.preventDefault()
  event.stopImmediatePropagation()
  button.disabled = true
  const original = button.textContent
  button.textContent = 'Opening payment…'

  try {
    await startPayment(button)
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Could not start payment')
  } finally {
    button.disabled = false
    button.textContent = original || 'Enroll'
  }
}, true)
