# WS Portal – Node.js + Supabase Backend

Express API on top of Supabase (Postgres, Auth, Storage). Paid memberships are required before a business or startup can be published.

## Setup
1. Create a Supabase project. In **SQL Editor**, run `supabase/schema.sql`. For an existing installation, apply `admin_approval_joining_fee.sql`, `member_directories.sql`, `business_listing_fee.sql`, `signup_fee_payment_type.sql`, `founder_profile_social_links.sql`, `business_reviews.sql`, `startup_details.sql`, `homepage_featured_order.sql`, `business_portfolio_fields.sql`, `business_mission_vision.sql`, `membership_listing_plans.sql`, and `event_ticketing.sql` before deploying.
2. Supabase **Auth > URL Configuration**: add `https://warangal-startups.vercel.app` to Site URL / Redirect URLs (the previous `https://ws-portel.web.app` origin is also accepted).
3. `cp .env.example .env` and fill in the Supabase keys (Supabase *Project Settings > API*) and Razorpay keys. Create a ₹299 monthly plan and a ₹5,200 yearly plan in Razorpay, then set their IDs as `RAZORPAY_MONTHLY_PLAN_ID` and `RAZORPAY_YEARLY_PLAN_ID`; keep the same test/live mode for keys and plans. Set `PAYMENTS_ENABLED=true`.
4. `npm install && npm run dev` → http://localhost:4000/health
5. Account memberships are ₹3,100 for the first monthly payment followed by ₹299/month autopay, or ₹5,200 with yearly autopay. One account membership applies to all businesses and startups owned by the account. Existing previously published listings remain visible; each account owner must authorize autopay through Razorpay checkout before the account is billed. Configure Razorpay webhooks for payment.captured, payment.failed, order.paid, subscription.charged, subscription.halted, and subscription.cancelled. Use test credentials for development and live credentials after Razorpay activates the merchant account.
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
| **Events** | GET `/api/events?q=&page=&limit=` · GET `/api/events/:idOrSlug` | – |
| | POST `/api/events` multipart fields `banner`, `title`, `description`, `startAt` (ISO date/time), `location`, `isFree`, `registrationFee` (rupees), `ticketCapacity` | ✔ approved organizer |
| | GET `/api/events/mine/hosted` · GET `/api/events/mine/tickets` | ✔ |
| | POST `/api/events/:eventId/register` `{name,email}` → free ticket or Razorpay order · POST `/api/events/registrations/verify` `{razorpay_order_id,razorpay_payment_id,razorpay_signature}` | ✔ attendee |
| **Business** | GET `/api/businesses?q=&category=&city=&minRating=&sort=&page=&limit=` | – |
| | GET `/api/share/business/:slug` (published business logo + synopsis Open Graph preview; browser redirects to the WS Hub profile) | – |
| | GET `/api/businesses/:idOrSlug` (drafts visible to owner/admin) · POST `/:id/view` | optional |
| | POST `/api/businesses` · GET `/mine` · PATCH/DELETE `/:id` · POST `/:id/publish` `/unpublish` | ✔ owner |
| | POST `/:id/logo` · `/:id/cover` (multipart `file`) | ✔ owner |
| | GET `/:id/services` · POST/PATCH/DELETE `/:id/services[/:serviceId]` (plan-limited) | owner for writes |
| | GET `/:id/reviews` · POST `/:id/reviews` `{rating,comment}` · DELETE `/:id/reviews/mine` | ✔ for writes |
| | POST/DELETE `/:id/favorite` | ✔ |
| **Payments** | GET `/api/payments/signup/status` · POST `/api/payments/signup/checkout` (authenticated, pending accounts allowed) | ✔ |
| | POST `/api/payments/verify` (server verifies Razorpay signature, captured amount, and ownership) · POST `/api/payments/webhook` | signup account may verify before admin approval |
| | GET `/api/payments/plans` · GET `/api/payments/membership` · GET `/api/payments/history` · `/subscription/:businessId` · POST `/api/payments/checkout` `{planCode}` | Account level monthly or yearly Razorpay autopay |
| | POST `/api/payments/listing-fee/checkout` | Legacy route; membership subscription checkout replaces this listing-specific payment |
| **Admin** | GET `/api/admin/stats` `/users` `/businesses` `/payments?status=created\|paid\|failed\|refunded` (paginated business-plan payment records) · PATCH `/users/:id/role` `/businesses/:id` · DELETE `/reviews/:id` | ✔ admin |
| | PATCH `/api/admin/users/:id/approval` `{status: approved\|rejected, note?}` | ✔ admin |

## Signup and admin approval
Signup and account approval are free. Business creation is free; publishing requires an active monthly or yearly membership. The member type is saved alongside each account; approved founders and business owners appear in the founders directory, while approved investors and mentors appear in the investors directory.

New accounts get `profiles.approval_status = 'pending'`. Until an administrator approves them in the `/#/admin` panel, protected profile, business, and subscription API routes return `403` with an approval status. Administrators can review users, approve or reject accounts, and inspect user and business records. Existing accounts remain approved when applying the migration. To bootstrap the first admin, sign up and verify an account, then run `npm run seed:admin -- your@email.com` from this backend directory. Sign in at the WS Hub portal using that account's normal email/password or configured social sign-in; the Admin link appears in the navigation and `/#/admin` opens the console. The browser cannot grant itself admin access.

## Notes / assumptions
- Membership plans (₹3,100 first monthly payment then ₹299 monthly autopay, or ₹5,200 auto-renewing yearly) and categories are seeded in `schema.sql` and `membership_listing_plans.sql`. One active membership is stored against the user account and applies to all listings they own.
- Event creators need an approved account. Paid ticket orders reserve capacity for 15 minutes; captured payments issue a confirmed ticket code. If payment is captured after capacity has been resold, the registration goes to organizer review rather than overselling.
- Writes go through this API with the service-role key; RLS policies protect direct client access.
- Business lifecycle: `draft` → `published` (requires description, category, city, contact) → `suspended` (admin only).

## Business portfolio editor additions

For existing databases, apply `supabase/business_portfolio_fields.sql` in Supabase SQL Editor before deploying this update. The migration adds the business/startup directory choice, Google Maps URL, established year, employee count, products, and categorized gallery data. A fresh install gets the same fields from `supabase/schema.sql`.

Business updates accept `mission` and `vision` (up to 2,000 characters each), `mapUrl`, `listingType` (`business` or `startup`), `establishedYear`, `employeeCount`, ordered `products` (`name`, `description`, optional `price` and `image`), and ordered `gallery` (`image`, `label`, `group`: Office, Team, Events, Products, or Other). Filter published listings with `GET /api/businesses?listingType=business` or `?listingType=startup`. Upload a product/gallery image through `POST /api/businesses/:id/portfolio-media?kind=product|gallery`, as multipart field `file` (PNG/JPG/WEBP/GIF, up to 5 MB); save its returned URL in the portfolio update. Services and reviews use their existing endpoints. The public business profile supports reviews, URL sharing, and a downloadable `.vcf` contact card.

## Production website and API URLs

The website is https://warangal-startups.vercel.app; the API is https://wsh-gadn.onrender.com. Set the Vercel project environment variable VITE_API_URL=https://wsh-gadn.onrender.com. On Render, set FRONTEND_URL=https://warangal-startups.vercel.app; the API allows the Vercel origin in CORS by default. Apply supabase/business_mission_vision.sql to existing databases before using mission and vision.
