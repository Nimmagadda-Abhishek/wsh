# WS Hub profile and business pages

The frontend integration is in `C:\Users\shiva\Downloads\pixel-perfect-design-conversion (1)`. Its React hash router now includes `/#/auth/verified`, `/#/auth/reset-password`, `/#/profile/edit`, `/#/businesses/manage`, and `/#/businesses/:id/edit`.

## Local setup

1. Configure the Supabase URL, anon key, and service-role key in `.env`.
2. Set frontend `VITE_API_URL=http://localhost:4000` and backend verification/reset redirect URLs to `http://localhost:5173/#/auth/verified` and `http://localhost:5173/#/auth/reset-password`.
3. Add those frontend URLs to Supabase Authentication → URL Configuration → Redirect URLs. Use the deployed WS Hub origin in production.
4. Apply `supabase/schema.sql`. On an existing project, review and apply the new `businesses` table and `profiles.role` column additions.
5. Start the API on port 4000 and the frontend with Vite; open `http://localhost:5173/#/profile/edit` or `http://localhost:5173/#/businesses/manage`.

The frontend uses its existing Bearer-token API helper and local Supabase session. The homepage “List Your Business” call to action, signed-in navigation, and dashboard link to the new pages. Add the local and production redirect URLs to Supabase's allow-list. No Firebase Hosting rewrite is needed for hash routes.

The homepage “List Your Business” CTA, signed-in navigation, and dashboard link to the new pages. The routes are part of the frontend source, so the frontend must be deployed to make them live at `https://ws-portel.web.app`. Hash routes need no hosting rewrites. Configure Supabase confirmation and recovery redirect allow-lists to target the frontend routes.

## Business API added for these screens

- `GET /api/businesses/mine` lists the signed-in owner’s records.
- `GET /api/home/categories` lists categories available to the editor.
- `POST /api/businesses` creates a draft (name required; limit five per owner).
- `GET /api/businesses/:idOrSlug` returns a published business publicly, or an owner’s draft when authenticated.
- `PATCH /api/businesses/:id` updates only the owner’s business.
- `POST /api/businesses/:id/publish` validates required profile details before publishing.
- `POST /api/businesses/:id/unpublish` returns the owner’s published profile to draft.

The schema file uses Supabase RLS and the API additionally filters every owner write by the verified Supabase UID.
