# WS Portal – Node.js + Supabase Backend

Express API on top of Supabase (Postgres, Auth, Storage). Razorpay collects a one-time ₹2 account joining fee. Business listings are free after signup; there is no recurring signup charge.

## Setup
1. Create a Supabase project. In **SQL Editor**, run `supabase/schema.sql`. For an existing installation, apply `supabase/admin_approval_joining_fee.sql`, `supabase/member_directories.sql`, `supabase/business_listing_fee.sql`, `supabase/signup_fee_payment_type.sql`, `supabase/founder_profile_social_links.sql`, `supabase/business_reviews.sql`, `supabase/startup_details.sql`, and `supabase/homepage_featured_order.sql`. For existing databases, also apply `supabase/business_portfolio_fields.sql` and `supabase/business_mission_vision.sql`.
2. Supabase **Auth > URL Configuration**: add `https://warangal-startups.vercel.app` to Site URL / Redirect URLs (the previous `https://ws-portel.web.app` origin is also accepted).
3. `cp .env.example .env` and fill in the Supabase keys (Supabase *Project Settings > API*), `RAZORPAY_KEY_ID`, and `RAZORPAY_KEY_SECRET` from your Razorpay account. Set `PAYMENTS_ENABLED=true`. Configure `RAZORPAY_WEBHOOK_SECRET` and a Razorpay webhook endpoint at `/api/payments/webhook` for payment event reconciliation.
4. `npm install && npm run dev` → http://localhost:4000/health
5. The ₹2 checkout requires Razorpay credentials and `PAYMENTS_ENABLED=true`. Use live credentials only after Razorpay has approved and activated the merchant account; use test credentials for development.
6. Create your own account in the portal and verify its email. Then grant it admin access from the backend folder with `npm run seed:admin -- your@email.com`. This script only promotes an existing, email-verified account; it never creates credentials. Keep the service-role key private.
7. Schedule `select public.expire_subscriptions();` daily (pg_cron or any cron).

If the API reports that `businesses.mission` is missing from the schema cache, run `supabase/business_mission_vision.sql` in the Supabase SQL Editor. It adds both `mission` and `vision` safely and asks PostgREST to reload its schema cache. Confirm the query succeeds, then retry saving the profile.

## Auth model
The frontend sends `Authorization: Bearer <access_token>` (from `/api/auth/login`, or from supabase-js directly, e.g. Google OAuth). Tokens are validated with `supabase.auth.getUser`. Responses are `{ data, meta? }` or `{ error, details? }`.

## WS Hub website owner pages
The React frontend source is included in `frontend/`. Run `npm install` and `npm run dev` from that directory for local development; set `VITE_API_URL` to this API's origin. The site includes `/#/profile/edit`, `/#/businesses/manage`, `/#/businesses/:id/edit`, `/#/auth/verified`, and `/#/auth/reset-password`. Set Supabase Authentication → URL Configuration → Site URL to `https://warangal-startups.vercel.app`, and allow `https://warangal-startups.vercel.app/**` plus the local Vite callback URLs. The backend sends email confirmation and recovery redirects to the frontend's hash routes. Hash routes require no hosting rewrites. Deploy the backend and frontend separately to make changes live.

The profile editor sends the API's `fullName` field. Business edit payloads use `categoryId`, `postalCode`, `socialLinks`, `logoUrl`, and `coverUrl`; optional nullable profile values may be cleared. Password changes from the reset screen require the recovery access token from Supabase's email link.

## Endpoints
| Area | Method & path | Auth |
|---|---|---|
| **Auth** | POST `/api/auth/signup` `{email,password,fullName,phone?,accountType?,memberType?}` → creates account; starts in `pending` approval | – |
| | POST `/api/auth/login` · `/refresh` `{refreshToken}` · `/forgot-password` · `/resend-verification` | – |
| | POST `/api/auth/logout` · `/change-password` · `/reset-password` (recovery token) · GET `/me` | ✔ |
| **Home** | GET `/api/home` (categories, featured, topRated, latest, plans, stats) · `/api/home/categories` · `/api/home/search?q=` | – |
| **Profile** | GET/PATCH/DELETE `/api/profile` · POST `/api/profile/avatar` (multipart `file`) | ✔ |
| | PATCH `/api/profile` accepts `socialLinks` as optional URL map (e.g. `instagram`, `linkedin`, `portfolio`, `website`, `youtube`, `x`) | ✔ |
| | GET `/api/profile/public/:username` | – |
| **Directory** | GET `/api/directory/founders?page=&limit=` · `/investors?page=&limit=` (approved members and published businesses) · GET `/api/directory/members/:id` | – |
| | GET `/api/profile/favorites` · GET `/api/profile/notifications` · PATCH `/api/profile/notifications/read` | ✔ |
| **Business** | GET `/api/businesses?q=&category=&city=&minRating=&sort=&page=&limit=` | – |
| | GET `/api/share/business/:slug` (published business logo + synopsis Open Graph preview; browser redirects to the WS Hub profile) | – |
| | GET `/api/businesses/:idOrSlug` (drafts visible to owner/admin) · POST `/:id/view` | optional |
| | POST `/api/businesses` · GET `/mine` · PATCH/DELETE `/:id` · POST `/:id/publish` `/unpublish` | ✔ owner |
| | POST `/:id/logo` · `/:id/cover` (multipart `file`) | ✔ owner |
| | GET `/:id/services` · POST/PATCH/DELETE `/:id/services[/:serviceId]` (plan-limited) | owner for writes |
| | GET `/:id/reviews` · POST `/:id/reviews` `{rating,comment}` · DELETE `/:id/reviews/mine` | ✔ for writes |
| | POST/DELETE `/:id/favorite` | ✔ |
| **Payments** | GET `/api/payments/signup/status` · POST `/api/payments/signup/checkout` (authenticated, pending accounts allowed) | ✔ |
| | POST `/api/payments/verify` (server verifies Razorpay signature, captured status, ₹2 amount, and ownership) · POST `/api/payments/webhook` | signup account may verify before admin approval |
| | GET `/api/payments/plans` · GET `/api/payments/history` · `/subscription/:businessId` · POST `/api/payments/checkout` | Paid plan checkout returns 410; free plan changes remain available |
| | POST `/api/payments/listing-fee/checkout` | Removed; returns 410 because business listings are free |
| **Admin** | GET `/api/admin/stats` `/users` `/businesses` `/payments?status=created\|paid\|failed\|refunded` (paginated business-plan payment records) · PATCH `/users/:id/role` `/businesses/:id` · DELETE `/reviews/:id` | ✔ admin |
| | PATCH `/api/admin/users/:id/approval` `{status: approved\|rejected, note?}` | ✔ admin |

## Signup and admin approval
Signup requires a one-time ₹2 joining fee before an administrator can approve the account. Business creation and publishing have no additional fee. Public business listings depend on published status, not the legacy listing-fee flag. The member type is saved alongside each account; approved founders and business owners appear in the founders directory, while approved investors and mentors appear in the investors directory.

New accounts get `profiles.approval_status = 'pending'`. Until an administrator approves them in the `/#/admin` panel, protected profile, business, and subscription API routes return `403` with an approval status. Administrators can review users, approve or reject accounts, and inspect user and business records. Existing accounts remain approved when applying the migration. To bootstrap the first admin, sign up and verify an account, then run `npm run seed:admin -- your@email.com` from this backend directory. Sign in at the WS Hub portal using that account's normal email/password or configured social sign-in; the Admin link appears in the navigation and `/#/admin` opens the console. The browser cannot grant itself admin access.

## Signup joining fee
After email confirmation and sign-in, an unpaid account is sent to `/#/signup/payment`. The server creates a Razorpay order for exactly ₹2, verifies the checkout signature and captured payment against that order, and records the result in `signup_payments` plus the admin payment ledger. Payment is required only once per user account. The admin approval endpoint rejects unpaid accounts. Configure the Razorpay webhook URL and secret for event reconciliation, and configure the matching environment variables in local development and the deployed API. Business listings remain free.

## Notes / assumptions
- Plans (Free / Pro ₹499 / Premium ₹999) and categories are seed data in `schema.sql`. Edit freely.
- Writes go through this API with the service-role key; RLS policies protect direct client access.
- Business lifecycle: `draft` → `published` (requires description, category, city, contact) → `suspended` (admin only).

## Business portfolio editor additions

For existing databases, apply `supabase/business_portfolio_fields.sql` in Supabase SQL Editor before deploying this update. The migration adds the business/startup directory choice, Google Maps URL, established year, employee count, products, and categorized gallery data. A fresh install gets the same fields from `supabase/schema.sql`.

Business updates accept `mission` and `vision` (up to 2,000 characters each), `mapUrl`, `listingType` (`business` or `startup`), `establishedYear`, `employeeCount`, ordered `products` (`name`, `description`, optional `price` and `image`), and ordered `gallery` (`image`, `label`, `group`: Office, Team, Events, Products, or Other). Filter published listings with `GET /api/businesses?listingType=business` or `?listingType=startup`. Upload a product/gallery image through `POST /api/businesses/:id/portfolio-media?kind=product|gallery`, as multipart field `file` (PNG/JPG/WEBP/GIF, up to 5 MB); save its returned URL in the portfolio update. Services and reviews use their existing endpoints. The public business profile supports reviews, URL sharing, and a downloadable `.vcf` contact card.

## Production website and API URLs

The website is https://warangal-startups.vercel.app; the API is https://wsh-gadn.onrender.com. Set the Vercel project environment variable VITE_API_URL=https://wsh-gadn.onrender.com. On Render, set FRONTEND_URL=https://warangal-startups.vercel.app; the API allows the Vercel origin in CORS by default. Apply supabase/business_mission_vision.sql to existing databases before using mission and vision.
