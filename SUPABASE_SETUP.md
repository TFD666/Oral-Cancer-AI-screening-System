# Supabase Setup

This file is the exact setup sequence for the current Oral Health Assistant project.

## 1. Project credentials

Already wired locally:

- Backend: `backend/.env`
- Frontend: `frontend/.env`

Current values:

- `SUPABASE_URL=https://xslpozhniiknyasptebw.supabase.co`
- `SUPABASE_ANON_KEY` is required in both frontend and backend
- `VITE_SUPABASE_URL=https://xslpozhniiknyasptebw.supabase.co`
- `VITE_API_BASE_URL=http://localhost:8000`

## 2. Run the database SQL

Open the Supabase SQL Editor and run the contents of:

- `backend/schema.sql`

What this creates:

- `patients` — self-patient records (one per authenticated user, auto-created on first scan)
- `predictions` — scan results linked to patient records
- `user_preferences` — display name and notification toggle storage
- `chat_messages` — AI chat history for the Care & Guidance feature
- indexes for the main lookup paths
- row-level security on all four tables

Why the RLS matters:

- The FastAPI backend already filters by `created_by = user.email`
- RLS makes the same rule true at the database layer, so a bug in application code does not automatically become a data leak

## 3. Create storage buckets

In Supabase Storage, create these buckets:

- `uploads`
- `heatmaps`

Bucket settings:

- access: private
- public bucket: disabled

Why private:

- The backend returns signed URLs
- This keeps raw file access behind authenticated application logic instead of exposing medical images directly

## 4. Enable Google OAuth in Supabase

In Supabase:

1. Go to `Authentication`
2. Open `Providers`
3. Enable `Google`
4. Add your Google OAuth client ID and client secret

You will need this redirect URI in Google Cloud Console:

- `https://xslpozhniiknyasptebw.supabase.co/auth/v1/callback`

## 5. Configure site URL and redirect URLs

In Supabase Authentication URL settings:

- Site URL: `http://localhost:5173`

Additional redirect URLs:

- `http://localhost:5173`
- `http://localhost:5173/dashboard`

Why:

- The frontend sign-in flow redirects back into the React app after Google OAuth

## 6. Recommended manual checks

After setup, verify these in order:

1. Google provider is enabled
2. `uploads` and `heatmaps` exist and are private
3. `patients`, `predictions`, `user_preferences`, and `chat_messages` tables have RLS enabled
4. `frontend/.env` and `backend/.env` match the same Supabase project

## 7. What happens next in code

Once the dashboard side is configured in Supabase, the next code step is:

1. run backend locally
2. verify `/auth/me` with a real Supabase session
3. wire dashboard/history/patients/report pages to live API data
4. test storage upload and signed URL flow through `/predict`

## 8. Security note

The service role key has already been used locally for setup. Since it was also shared in chat, rotating it after setup would be the safer long-term move.
