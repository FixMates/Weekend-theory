# Weekend Theory

Premium, mobile-first trip discovery and booking website for curated weekend departures from Bengaluru.

## Frontend features
- Responsive trip cards and category filters.
- Trip details with proposed route, sample sightseeing stops and break timings.
- AC / Non-AC vehicle choice, seating size, departure-date selector, pickup preference and traveller details.
- Razorpay Checkout wiring, designed to connect to the separate API in `server/`.
- WhatsApp enquiry fallback while the API URL is not configured.

**Important:** The trip names, itinerary timings and prices currently shown are illustrative placeholders, not confirmed departures. Confirm destinations, route timings, actual vehicle availability/capacity, inclusions/exclusions, meal costs, cancellation/refund policy and exact pickup point before accepting bookings or running ads.

## Razorpay setup

The `server/` folder contains a Node.js API that creates Razorpay Orders on the server, verifies payment signatures, checks the payment with Razorpay and records booking requests in Supabase. The Key Secret and Supabase service-role key must stay on the server, never in browser JavaScript or GitHub.

1. Create/activate a Razorpay account and begin with **Test Mode** API keys.
2. Create a Supabase project and run `server/schema.sql` in its SQL Editor.
3. Deploy `server/` as a Node.js web service with HTTPS. Configure these environment variables in the host dashboard:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_ORIGIN=https://fixmates.github.io`
   - `BOOKING_TOKEN_RUPEES=100`
4. To run locally, copy `server/.env.example` to `server/.env`, add your Test Mode keys and Supabase values, then run `npm install` and `npm start` from the `server/` directory.
5. In `index.html`, set `API_BASE_URL` in the booking submit handler to your deployed API base URL (HTTPS, no trailing slash). The site will continue to use the WhatsApp enquiry fallback until this is configured.
6. Test successful and failed payments end-to-end with Razorpay Test Mode before switching to Live Mode.

The ₹100-per-traveller token is a proposed setting, not a final commercial policy. Decide whether it is refundable, how it applies to the total fare, and what happens if a trip is cancelled before accepting payments.

## Publish frontend with GitHub Pages
Open repository **Settings → Pages → Deploy from a branch → `main` → `/(root)` → Save**. The published URL will be shown in the Pages settings once deployment completes.

## Before taking real bookings
This starter records payment-verified booking requests; it does not automatically reserve vehicle inventory or guarantee that a trip will depart. The organiser must confirm availability and final departure details. Before scaling, add inventory/seat locking, refund workflows, verified webhook handling, booking notifications and clear legal/policy pages.
