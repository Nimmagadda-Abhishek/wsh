# WS Portal – Node.js + Supabase Backend

Express API on top of Supabase (Postgres, Auth, Storage) with Razorpay payments.

## Setup
1. Create a Supabase project. In **SQL Editor**, run `supabase/schema.sql`. For an existing installation, apply `supabase/admin_approval_joining_fee.sql` and `supabase/member_directories.sql`; these preserve existing account approval and add public member categories.
2. Supabase **Auth > URL Configuration**: add `https://ws-portel.web.app` to Site URL / Redirect URLs.
3. `cp .env.example .env` and fill in the keys (Supabase *Project Settings > API*, Razorpay dashboard). Use Razorpay credentials for the environment you intend to run, and configure payment auto-capture.
4. `npm install && npm run dev` → http://localhost:4000/health
5. Razorpay dashboard → Webhooks → `https://<your-api>/api/payments/webhook`, events `payment.captured`, `payment.failed`, `order.paid`, secret = `RAZORPAY_WEBHOOK_SECRET`.
6. Create your own account in the portal and verify its email. Then grant it admin access from the backend folder with `npm run seed:admin -- your@email.com`. This script only promotes an existing, email-verified account; it never creates credentials. Keep the service-role key private.
7. Schedule `select public.expire_subscriptions();` daily (pg_cron or any cron).

## Auth model
The frontend sends `Authorization: Bearer <access_token>` (from `/api/auth/login`, or from supabase-js directly, e.g. Google OAuth). Tokens are validated with `supabase.auth.getUser`. Responses are `{ data, meta? }` or `{ error, details? }`.

## WS Hub website owner pages
The matching React frontend is in `C:\Users\shiva\Downloads\pixel-perfect-design-conversion (1)`. It now includes `/#/profile/edit`, `/#/businesses/manage`, `/#/businesses/:id/edit`, `/#/auth/verified`, and `/#/auth/reset-password`; dashboard, account navigation, and the home-page business CTA link into these pages. Set the frontend `VITE_API_URL` to this API's origin. Add the exact confirmation and recovery URLs from `.env` to Supabase Authentication → URL Configuration → Redirect URLs. For production, use `https://ws-portel.web.app/#/auth/verified` and `https://ws-portel.web.app/#/auth/reset-password`; for Vite local development, use the equivalent `http://localhost:5173/#/...` URLs. Hash routes require no hosting rewrites. Deploy the updated frontend separately to make the pages live.

The profile editor sends the API's `fullName` field. Business edit payloads use `categoryId`, `postalCode`, `socialLinks`, `logoUrl`, and `coverUrl`; optional nullable profile values may be cleared. Password changes from the reset screen require the recovery access token from Supabase's email link.

## Endpoints
| Area | Method & path | Auth |
|---|---|---|
| **Auth** | POST `/api/auth/signup/order` `{email}` → Razorpay order for the ₹2 joining fee | – |
| | POST `/api/auth/signup` `{email,password,fullName,phone?,accountType?,memberType,razorpay_order_id,razorpay_payment_id,razorpay_signature}` → creates account only after server verifies captured payment; starts in `pending` approval | – |
| | POST `/api/auth/login` · `/refresh` `{refreshToken}` · `/forgot-password` · `/resend-verification` | – |
| | POST `/api/auth/logout` · `/change-password` · `/reset-password` (recovery token) · GET `/me` | ✔ |
| **Home** | GET `/api/home` (categories, featured, topRated, latest, plans, stats) · `/api/home/categories` · `/api/home/search?q=` | – |
| **Profile** | GET/PATCH/DELETE `/api/profile` · POST `/api/profile/avatar` (multipart `file`) | ✔ |
| | GET `/api/profile/public/:username` | – |
| **Directory** | GET `/api/directory/founders?page=&limit=` · `/investors?page=&limit=` (approved members and published businesses) · GET `/api/directory/members/:id` | – |
| | GET `/api/profile/favorites` · GET `/api/profile/notifications` · PATCH `/api/profile/notifications/read` | ✔ |
| **Business** | GET `/api/businesses?q=&category=&city=&minRating=&sort=&page=&limit=` | – |
| | GET `/api/businesses/:idOrSlug` (drafts visible to owner/admin) · POST `/:id/view` | optional |
| | POST `/api/businesses` · GET `/mine` · PATCH/DELETE `/:id` · POST `/:id/publish` `/unpublish` | ✔ owner |
| | POST `/:id/logo` · `/:id/cover` (multipart `file`) | ✔ owner |
| | GET `/:id/services` · POST/PATCH/DELETE `/:id/services[/:serviceId]` (plan-limited) | owner for writes |
| | GET `/:id/reviews` · POST `/:id/reviews` `{rating,comment}` · DELETE `/:id/reviews/mine` | ✔ for writes |
| | POST/DELETE `/:id/favorite` | ✔ |
| **Payments** | GET `/api/payments/plans` | – |
| | POST `/api/payments/checkout` `{planCode,businessId}` → Razorpay order | ✔ owner |
| | POST `/api/payments/verify` `{razorpay_order_id,razorpay_payment_id,razorpay_signature}` | ✔ |
| | GET `/api/payments/history` · `/subscription/:businessId` | ✔ |
| | POST `/api/payments/webhook` | Razorpay signature |
| **Admin** | GET `/api/admin/stats` `/users` `/businesses` `/payments?status=created\|paid\|failed\|refunded` (paginated; payments include payer, plan, and business details) · PATCH `/users/:id/role` `/businesses/:id` · DELETE `/reviews/:id` | ✔ admin |
| | PATCH `/api/admin/users/:id/approval` `{status: approved\|rejected, note?}` | ✔ admin |

## Signup payment and admin approval
The signup page starts a ₹2 Razorpay Checkout order. After checkout, the API verifies the HMAC signature, confirms the payment belongs to the matching order and amount, captures it if needed, and only then creates the Supabase Auth user. The payment order is stored in `signup_payments` and cannot be reused. Configure Razorpay auto-capture and keep the production keys in the backend secret store. The member type is saved alongside the account; approved founders and business owners appear in the founders directory, while approved investors and mentors appear in the investors directory.

New accounts get `profiles.approval_status = 'pending'`. Until an administrator approves them in the `/#/admin` panel, protected profile, business, and subscription API routes return `403` with an approval status. Administrators can review users, approve or reject accounts, and inspect user and business records. Existing accounts remain approved when applying the migration. To bootstrap the first admin, sign up and verify an account, then run `npm run seed:admin -- your@email.com` from this backend directory. Sign in at the WS Hub portal using that account's normal email/password or configured social sign-in; the Admin link appears in the navigation and `/#/admin` opens the console. The browser cannot grant itself admin access.

## Payment flow
1. Frontend `POST /checkout` → gets `orderId, amount, keyId`.
2. Open Razorpay Checkout with those. On success call `POST /verify` with the 3 returned fields.
3. The webhook is a safety net if the user closes the tab. Both paths share an idempotent `fulfillPayment`, so a payment is never applied twice.
4. Free plan skips Razorpay. Paid plan sets `businesses.plan_code`, `is_featured` (premium), and the service limit.

## Notes / assumptions
- Plans (Free / Pro ₹499 / Premium ₹999) and categories are seed data in `schema.sql`. Edit freely.
- Writes go through this API with the service-role key; RLS policies protect direct client access.
- Business lifecycle: `draft` → `published` (requires description, category, city, contact) → `suspended` (admin only).
