require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json({ limit: '100kb' }));
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000,https://fixmates.github.io').split(',').map(v => v.trim()).filter(Boolean);
app.use(cors({ origin(origin, cb) { if (!origin || allowedOrigins.includes(origin)) return cb(null, true); return cb(new Error('Origin not allowed')); } }));

const port = process.env.PORT || 3000;
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tokenPerPersonRupees = Number(process.env.BOOKING_TOKEN_RUPEES || 100);
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } }) : null;
const razorpay = keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;
const trips = new Set(['Misty Mountain Reset', 'The Cinema Trail', 'Strangers, Not for Long']);
const vehicles = new Set(['AC', 'Non-AC']);
const seats = new Set(['4-seater car', '5-seater car', '6-seater vehicle', 'Tempo Traveller']);

function requireConfig(res) {
  if (!razorpay || !supabase) {
    res.status(503).json({ error: 'Payment backend is not configured. Set Razorpay and Supabase environment variables.' });
    return false;
  }
  return true;
}
app.get('/api/health', (_req, res) => res.json({ ok: true, paymentsConfigured: Boolean(razorpay && supabase) }));
app.post('/api/create-order', async (req, res) => {
  if (!requireConfig(res)) return;
  try {
    const b = req.body || {};
    const travellers = Number(b.travellers);
    const phone = String(b.phone || '').trim();
    const name = String(b.name || '').trim();
    if (!trips.has(b.trip) || !vehicles.has(b.vehicle) || !seats.has(b.seats) ||
        !Number.isInteger(travellers) || travellers < 1 || travellers > 9 ||
        name.length < 2 || name.length > 100 || !/^[0-9+() -]{8,18}$/.test(phone) ||
        !String(b.date || '').trim() || !String(b.pickup || '').trim()) {
      return res.status(400).json({ error: 'Please provide valid trip and traveller details.' });
    }
    const amount = Math.round(tokenPerPersonRupees * travellers * 100);
    const receipt = 'wt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    const order = await razorpay.orders.create({
      amount, currency: 'INR', receipt,
      notes: { trip: b.trip, departure: String(b.date).slice(0, 100), vehicle: b.vehicle, seats: b.seats, travellers: String(travellers) }
    });
    const { data, error } = await supabase.from('bookings').insert({
      trip_name: b.trip, departure_date: String(b.date), vehicle_type: b.vehicle,
      seat_type: b.seats, pickup_preference: String(b.pickup), customer_name: name,
      phone, travellers, amount_paise: amount, currency: 'INR', razorpay_order_id: order.id,
      payment_status: 'created', booking_status: 'payment_pending'
    }).select('id').single();
    if (error) throw new Error('Could not save booking record: ' + error.message);
    res.json({ keyId, orderId: order.id, amount: order.amount, currency: order.currency, bookingReference: data.id });
  } catch (e) {
    console.error('create-order failed:', e.message);
    res.status(500).json({ error: 'Could not start payment. Please retry or contact the trip organiser.' });
  }
});
app.post('/api/verify-payment', async (req, res) => {
  if (!requireConfig(res)) return;
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (![orderId, paymentId, signature].every(v => typeof v === 'string' && v.length > 5)) return res.status(400).json({ error: 'Missing payment verification fields.' });
    const { data: booking, error } = await supabase.from('bookings').select('id,amount_paise,payment_status').eq('razorpay_order_id', orderId).single();
    if (error || !booking) return res.status(404).json({ error: 'Booking order not found.' });
    const expected = crypto.createHmac('sha256', keySecret).update(orderId + '|' + paymentId).digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) return res.status(400).json({ error: 'Payment signature verification failed.' });
    const payment = await razorpay.payments.fetch(paymentId);
    if (payment.order_id !== orderId || payment.amount !== booking.amount_paise || payment.currency !== 'INR' || !['captured', 'authorized'].includes(payment.status)) {
      return res.status(400).json({ error: 'Payment is not in a valid state. Please contact support before retrying.' });
    }
    const { error: updateError } = await supabase.from('bookings').update({
      razorpay_payment_id: paymentId, payment_status: payment.status,
      booking_status: 'payment_verified', updated_at: new Date().toISOString()
    }).eq('id', booking.id);
    if (updateError) throw updateError;
    res.json({ verified: true, bookingReference: booking.id, paymentStatus: payment.status, message: 'Payment verified. The organiser must confirm trip availability and final departure details separately.' });
  } catch (e) {
    console.error('verify-payment failed:', e.message);
    res.status(500).json({ error: 'Payment could not be verified automatically. Do not pay again; contact the organiser.' });
  }
});
app.listen(port, () => console.log('Weekend Theory API listening on port ' + port));
