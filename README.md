# Weekend Theory

Mobile-first trip discovery and booking-enquiry website for curated weekend experiences from Bengaluru.

## Firebase architecture

- **Firebase Hosting** serves the static website from `public/`.
- **Cloud Functions for Firebase (Node.js 22)** provides the secure API in `functions/index.js`.
- **Cloud Firestore** stores booking records. Public client access is denied by `firestore.rules`.
- **Razorpay Checkout** is integrated in the frontend and connected to server-side order creation/payment verification. Checkout remains deliberately disabled until real departure dates, final fare policy and cancellation terms are confirmed. Credentials belong in Firebase Secret Manager, never in the website or GitHub.

The root `index.html` is retained for the existing GitHub Pages preview. When editing the website, keep it and `public/index.html` in sync; Firebase Hosting deploys `public/index.html`.

## Current readiness

- Firebase Hosting configuration: added.
- Firebase Functions API and Firestore rules: added.
- JavaScript syntax and JSON configuration: statically validated.
- Firebase deployment: **not yet run**; it requires access to your Firebase project and local CLI login.
- Razorpay Checkout UI/API integration: **implemented but disabled by default**. The frontend `PAYMENTS_ENABLED` flag and both frontend/backend `confirmedDepartures` allowlists are empty. Keep them disabled until actual dates, token policy, final fare, cancellation/refund terms and availability are confirmed. Backend rejects every order date not explicitly allowlisted.
- The backend's shared-trip order endpoint rejects dates that are not future and explicitly allowlisted as confirmed departures, and rejects private trips that have no confirmed full-vehicle quote. Razorpay payment status is checked server-side using the checkout signature, Razorpay's payment API and a signed `payment.captured` webhook.

## Before deployment

1. Confirm the actual trip routes, dates, prices, pickup points, inclusions/exclusions, vehicle capacities and cancellation/refund terms.
2. Create or select a Firebase project. Cloud Functions deployment requires the **Blaze (pay-as-you-go)** billing plan; set budget alerts and usage alerts before deploying.
3. Create a Cloud Firestore database in **asia-south1 (Mumbai)** to align with the function region. Firestore's database location cannot be changed later.
4. Create or activate a Razorpay account. Start with **Test Mode** API keys only.
5. Decide the token policy. The default `BOOKING_TOKEN_RUPEES` secret is set to `100` in the example below; change it if your policy differs.

## Deploy from Windows

Install Node.js 22 LTS from the official Node.js website, install Git if needed, and open PowerShell.

```powershell
git clone https://github.com/FixMates/Weekend-theory.git
cd Weekend-theory
npm install -g firebase-tools
firebase login
firebase projects:list
firebase use --add
```

When `firebase use --add` prompts you, select your existing Firebase project and give it the alias `default`. This creates a local `.firebaserc` file; it is intentionally not committed because the Firebase project ID is account-specific.

Set the required secrets interactively. Use your **Razorpay Test Mode** credentials for the first deployment. Configure `RAZORPAY_WEBHOOK_SECRET` with the webhook secret you create in the Razorpay dashboard:

```powershell
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set BOOKING_TOKEN_RUPEES
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
```

In the Razorpay dashboard, add a webhook endpoint at `https://YOUR_PROJECT_ID.web.app/api/razorpay-webhook` and subscribe to `payment.captured`. Use the exact same webhook secret in Firebase Secret Manager. Start in Test Mode.

Enter `100` for the token only if that is your intended policy. Never put the Razorpay Key Secret in `index.html`, `public/index.html`, a committed file, or a public chat.

Install the function dependencies and deploy:

```powershell
cd functions
npm install
cd ..
firebase deploy --only hosting,functions,firestore:rules
```

The CLI prints the Hosting URL, usually `https://YOUR_PROJECT_ID.web.app`. Open that URL and test trip details, filters, mobile layout and WhatsApp enquiry. The API health endpoint is `https://YOUR_PROJECT_ID.web.app/api/health`.

## Add a custom domain

In Firebase Console, open **Hosting → Add custom domain**, enter the domain you own and follow the exact DNS records Firebase displays. Do not guess DNS records. Firebase provisions HTTPS after DNS verification.

## Cost and billing safeguards

Firebase Hosting and Firestore may fit within their no-cost quotas at low usage, but Cloud Functions requires Blaze billing. Blaze is pay-as-you-go, not a guarantee of zero cost. Set a Google Cloud budget alert, monitor the Billing and Usage pages, and keep function max instances constrained (currently 5). Budget alerts notify you; they do not automatically stop all spending.

## Payment flow limitations before public launch

The Cinema Trail is configured from the supplied poster at ₹1,999 per person, with a ₹100 booking token intended (set `BOOKING_TOKEN_RUPEES=100` in Secret Manager). The backend supports creating a ₹-denominated Razorpay order for a **shared trip with an organiser-confirmed future departure date** and verifies the captured payment before marking it verified. It does not currently provide seat inventory locking, organiser/admin confirmation tools, refund automation, a Razorpay webhook, booking notifications or private-trip quote collection. The current frontend deliberately remains enquiry-first and does not initiate online payment. Complete and test these workflows in Razorpay Test Mode before enabling payment in the frontend or using Live Mode.

## Security

- Firestore client rules deny all direct public reads/writes to booking documents; the Admin SDK operates on the server.
- Razorpay credentials are loaded from Firebase Secret Manager.
- Never commit `.env` files, service-account keys, Razorpay secrets or Firebase Admin credentials.
