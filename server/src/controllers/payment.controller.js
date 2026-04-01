const Razorpay = require('razorpay')
const crypto = require('crypto')
const prisma = require('../config/db')
const ApiResponse = require('../utils/apiResponse')

const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)

const createOrder = async (req, res, next) => {
  try {
    if (!isRazorpayConfigured()) {
      return ApiResponse.error(res, 'Razorpay is not configured on server', 503)
    }
    const { settlementId, amount } = req.body
    const userId = req.user.userId
    if (!settlementId || !amount) return ApiResponse.error(res, 'settlementId and amount required', 400)
    const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } })
    if (!settlement) return ApiResponse.error(res, 'Settlement not found', 404)
    if (settlement.payerId !== userId) return ApiResponse.error(res, 'Only payer can initiate payment', 403)
    const razorpay = getRazorpay()
    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      receipt: `settlement_${settlementId}`,
      notes: { settlementId }
    })
    await prisma.settlement.update({ where: { id: settlementId }, data: { razorpayOrderId: order.id } })
    return ApiResponse.success(res, { orderId: order.id, amount: order.amount, currency: order.currency, settlementId, keyId: process.env.RAZORPAY_KEY_ID }, 'Order created')
  } catch (err) { return next(err) }
}

const verifyPayment = async (req, res, next) => {
  try {
    if (!isRazorpayConfigured()) {
      return ApiResponse.error(res, 'Razorpay is not configured on server', 503)
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, settlementId } = req.body
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return ApiResponse.error(res, 'Missing payment details', 400)
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex')
    if (expectedSig !== razorpay_signature) return ApiResponse.error(res, 'Invalid payment signature', 400)
    await prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'completed', razorpayPaymentId: razorpay_payment_id, paymentMethod: 'razorpay' }
    })
    return ApiResponse.success(res, null, 'Payment verified and settlement completed')
  } catch (err) { return next(err) }
}

const getPaymentStatus = async (req, res, next) => {
  try {
    const { settlementId } = req.params
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      select: { id: true, status: true, razorpayOrderId: true, razorpayPaymentId: true, amount: true }
    })
    if (!settlement) return ApiResponse.error(res, 'Settlement not found', 404)
    return ApiResponse.success(res, { settlement }, 'Payment status fetched')
  } catch (err) { return next(err) }
}

module.exports = { createOrder, verifyPayment, getPaymentStatus }
