# WS Hub API

Express and Supabase backend for WS Hub. The React frontend lives in `C:\Users\shiva\Downloads\pixel-perfect-design-conversion (1)`.

## Local setup

Requirements: Node.js 18 or newer and a Supabase project.

1. Copy `.env.example` to `.env` and set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Keep `.env` and the service-role key out of source control.
2. In Supabase, enable the authentication methods used by the frontend and configure email confirmation and password recovery redirect URLs from `.env` in Authentication → URL Configuration.
3. Run `supabase/schema.sql` in the Supabase SQL editor. Review the new `business_categories`, `businesses`, and `profiles.role` changes when applying to an existing project.
4. Run `npm install`, then `npm run dev`.

The API listens on port 4000 by default. `GET /health` reports service status.

## Bootstrap the first administrator

First create an account in the portal and confirm its email. Set the backend root `.env` values, including `SUPABASE_SERVICE_ROLE_KEY`, then run `npm run seed:admin -- admin@example.com`. The script promotes only an existing confirmed account and does not create or change its password. Sign into the portal with that account’s normal sign-in method.

## Pages and frontend setup

The frontend includes `/#/profile/edit`, `/#/businesses/manage`, `/#/businesses/:id/edit`, `/#/auth/verified`, and `/#/auth/reset-password`. Existing dashboard and homepage links navigate to these routes. Set `VITE_API_URL` in the frontend to the API origin (local: `http://localhost:4000`).

Configure Supabase Authentication → URL Configuration to allow the local and deployed frontend URLs. Set `EMAIL_VERIFICATION_REDIRECT_URL` and `PASSWORD_RESET_REDIRECT_URL` to `http://localhost:5173/#/auth/verified`, `http://localhost:5173/#/auth/reset-password` locally and their `https://ws-portel.web.app/#/...` equivalents in production. Set `FRONTEND_URL` and `ALLOWED_ORIGINS` to the deployed site origin. Never put the service-role key in frontend config.

## API

The API uses Supabase access tokens as Bearer tokens. Profile and business routes are documented in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md). Business owner endpoints include draft creation, owner-only edit, publish/unpublish, and category lookup. Owner filters use the authenticated Supabase user ID.

## Verification

- `npm test` runs four offline API contract checks for auth, profile, business owner, and category routes.
- `npm run build` checks JavaScript syntax for the backend and browser assets.
- `npm run lint` is available if ESLint is installed in the environment.

Supabase integration was not run here. The SQL schema and URL allow-list changes must be applied to the actual Supabase project. The frontend has a hash router, so its route paths do not require server rewrites.
