const express = require('express');
const crypto = require('node:crypto');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const Razorpay = require('razorpay');

initializeApp();
const db = getFirestore();
const app = express();

// Razorpay signs the exact raw request body. Register this route before express.json().
app.post('/api/razorpay-webhook', express.raw({ type: 'application/json', limit: '100kb' }), async (req, res) => {
  try {
    const secret = razorpayWebhookSecret.value();
    const signature = req.get('x-razorpay-signature') || '';
    if (!secret || !signature || !Buffer.isBuffer(req.body)) {
      return res.status(400).send('Invalid webhook configuration or body.');
    }
    const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(signature, 'hex');
    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return res.status(400).send('Invalid webhook signature.');
    }

    const event = JSON.parse(req.body.toString('utf8'));
    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (payment?.order_id && payment.status === 'captured') {
        const matches = await db.collection('bookings').where('razorpayOrderId', '==', payment.order_id).limit(1).get();
        if (!matches.empty) {
          const doc = matches.docs[0];
          const booking = doc.data();
          if (payment.amount === booking.amountPaise && payment.currency === 'INR') {
            await doc.ref.update({
              razorpayPaymentId: payment.id,
              paymentStatus: 'captured',
              bookingStatus: 'payment_verified_pending_trip_confirmation',
              updatedAt: FieldValue.serverTimestamp()
            });
          } else {
            console.error('Webhook payment amount/currency mismatch for order:', payment.order_id);
          }
        }
      }
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Razorpay webhook failed:', err.message);
    return res.status(400).send('Webhook processing failed.');
  }
});

app.use(express.json({ limit: '50kb' }));

const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');
const bookingTokenRupees = defineSecret('BOOKING_TOKEN_RUPEES');
const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');

const validTrips = new Set([
  'Misty Mountain Reset',
  'The Cinema Trail',
  'Strangers, Not for Long'
]);

// Keep empty until the organiser confirms real departures. Add exact YYYY-MM-DD dates here before accepting payments.
const confirmedDepartures = {
  'Misty Mountain Reset': [],
  'The Cinema Trail': [],
  'Strangers, Not for Long': []
};

function indiaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function getRazorpay() {
  const keyId = razorpayKeyId.value();
  const keySecret = razorpayKeySecret.value();
  if (!keyId || !keySecret) throw new Error('Payment gateway is not configured.');
  return { client: new Razorpay({ key_id: keyId, key_secret: keySecret }), keyId, keySecret };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'weekend-theory-api', paymentFlow: 'requires confirmed departure and configured Razorpay secrets' });
});

app.post('/api/create-order', async (req, res) => {
  try {
    const b = req.body || {};
    const travellers = Number(b.travellers);
    const name = String(b.name || '').trim();
    const phone = String(b.phone || '').trim();
    const date = String(b.date || '').trim();

    // Only shared trips can pay a per-person token online. Private trips need a confirmed full-vehicle quote.
    if (b.travelStyle !== 'shared') {
      return res.status(400).json({ error: 'Private trips require a confirmed full-vehicle quote before payment.' });
    }
    if (!validTrips.has(b.trip) ||
        !Number.isInteger(travellers) || travellers < 1 || travellers > 9 ||
        name.length < 2 || name.length > 100 ||
        !/^[0-9+() -]{8,18}$/.test(phone) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= indiaToday() ||
        !Array.isArray(confirmedDepartures[b.trip]) || !confirmedDepartures[b.trip].includes(date)) {
      return res.status(400).json({ error: 'Online booking is available only for organiser-confirmed departure dates. Please enquire for current availability.' });
    }

    const tokenRupees = Number(bookingTokenRupees.value() || 100);
    if (!Number.isFinite(tokenRupees) || tokenRupees < 1 || tokenRupees > 10000) {
      return res.status(500).json({ error: 'Booking token configuration is invalid.' });
    }

    const { client, keyId } = getRazorpay();
    const amountPaise = Math.round(tokenRupees * travellers * 100);
    const order = await client.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: 'wt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20),
      notes: {
        trip: b.trip,
        departure: date,
        travelStyle: 'shared',
        travellers: String(travellers)
      }
    });

    const bookingRef = await db.collection('bookings').add({
      tripName: b.trip,
      departureDate: date,
      travelStyle: 'shared',
      vehicleType: 'assigned_by_organiser',
      seatType: 'assigned_by_organiser',
      pickupPreference: String(b.pickup || 'To be confirmed').slice(0, 200),
      customerName: name,
      phone,
      travellers,
      tokenRupees,
      amountPaise,
      currency: 'INR',
      razorpayOrderId: order.id,
      razorpayPaymentId: null,
      paymentStatus: 'created',
      bookingStatus: 'payment_pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return res.json({
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingReference: bookingRef.id
    });
  } catch (err) {
    console.error('create-order failed:', err.message);
    return res.status(500).json({ error: 'Could not start payment. Please retry or contact the organiser.' });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (![orderId, paymentId, signature].every(v => typeof v === 'string' && v.length > 5)) {
      return res.status(400).json({ error: 'Missing payment verification fields.' });
    }

    const snapshot = await db.collection('bookings').where('razorpayOrderId', '==', orderId).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Booking order not found.' });
    const bookingDoc = snapshot.docs[0];
    const booking = bookingDoc.data();

    const { client, keySecret } = getRazorpay();
    const expected = crypto.createHmac('sha256', keySecret).update(orderId + '|' + paymentId).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(signature, 'hex');
    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return res.status(400).json({ error: 'Payment signature verification failed.' });
    }

    if (booking.paymentStatus === 'captured' && booking.razorpayPaymentId === paymentId) {
      return res.json({ verified: true, bookingReference: bookingDoc.id, paymentStatus: 'captured' });
    }

    const payment = await client.payments.fetch(paymentId);
    if (payment.order_id !== orderId ||
        payment.amount !== booking.amountPaise ||
        payment.currency !== 'INR' ||
        payment.status !== 'captured') {
      return res.status(400).json({ error: 'Payment is not captured or does not match this booking.' });
    }

    await bookingDoc.ref.update({
      razorpayPaymentId: paymentId,
      paymentStatus: 'captured',
      bookingStatus: 'payment_verified_pending_trip_confirmation',
      updatedAt: FieldValue.serverTimestamp()
    });

    return res.json({
      verified: true,
      bookingReference: bookingDoc.id,
      paymentStatus: 'captured',
      message: 'Payment verified. Trip departure and availability still require organiser confirmation.'
    });
  } catch (err) {
    console.error('verify-payment failed:', err.message);
    return res.status(500).json({ error: 'Payment could not be verified automatically. Do not pay again; contact the organiser.' });
  }
});

exports.api = onRequest({
  region: 'asia-south1',
  secrets: [razorpayKeyId, razorpayKeySecret, bookingTokenRupees, razorpayWebhookSecret],
  maxInstances: 5,
  timeoutSeconds: 30
}, app);
