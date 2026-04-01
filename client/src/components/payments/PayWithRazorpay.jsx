import { useState } from 'react'
import toast from 'react-hot-toast'
import { createPaymentOrder, verifyPayment } from '../../api/payments.api'
import Button from '../ui/Button'

const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) { resolve(true); return }
  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.onload = () => resolve(true)
  script.onerror = () => resolve(false)
  document.body.appendChild(script)
})

export default function PayWithRazorpay({ settlement, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID

  const handlePay = async () => {
    try {
      if (!razorpayKey) {
        toast.error('Razorpay is not configured in frontend env')
        return
      }
      setLoading(true)
      const loaded = await loadRazorpayScript()
      if (!loaded) { toast.error('Failed to load payment gateway'); return }

      const orderRes = await createPaymentOrder({ settlementId: settlement.id, amount: settlement.amount })
      const order = orderRes?.data

      if (!order?.orderId) { toast.error('Failed to create payment order'); return }

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: 'INR',
        name: 'Splitora',
        description: `Pay ${settlement.receiver?.name || 'member'}`,
        order_id: order.orderId,
        prefill: { name: settlement.payer?.name || '', email: settlement.payer?.email || '' },
        theme: { color: '#7c3aed' },
        handler: async (response) => {
          try {
            await verifyPayment({ ...response, settlementId: settlement.id })
            toast.success('Payment successful! Settlement completed.')
            onSuccess?.()
          } catch { toast.error('Payment verification failed') }
        },
        modal: { ondismiss: () => setLoading(false) }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="outline" loading={loading} onClick={handlePay} disabled={!razorpayKey}>
      Pay via UPI
    </Button>
  )
}
