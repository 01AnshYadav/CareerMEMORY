// Central API base configuration for the frontend.
//
// NEXT_PUBLIC_API_URL is injected at build time:
//   - Local development: set it in frontend/.env.local (e.g. http://localhost:8000)
//   - Production (Vercel): set it in the Vercel project environment variables
//
// There is intentionally NO localhost fallback here: if the variable is missing
// the app requests a relative path and fails loudly during development, instead
// of silently calling a user's localhost in production.
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''