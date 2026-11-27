const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// 1. Health Check (App check karega ki server live hai ya nahi)
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ProxyMax Billing Backend' });
});

// 2. ₹199 VIP Order Create Karein
app.post('/create-order', async (req, res) => {
  try {
    const order = await razorpay.orders.create({
      amount: 19900, // ₹199 in paise
      currency: 'INR',
      receipt: `vip_${Date.now()}`,
    });
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Payment Signature Verify Karein (HMAC-SHA256)
app.post('/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Missing payment fields' });
  }

  const generatedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature === razorpay_signature) {
    // 30 din ki validity return karein
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    return res.json({
      verified: true,
      plan: 'VIP',
      maxTabs: 20,
      expiresAt,
    });
  } else {
    return res.status(400).json({ verified: false, error: 'Invalid HMAC signature' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
