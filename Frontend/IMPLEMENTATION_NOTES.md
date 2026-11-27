# AI Career & Learning Hub — Consolidated Frontend

This folder contains the consolidated frontend implementation. It includes the authentication flow, OTP verification screen, responsive workspace navigation, dashboard, career and study tools, existing interview generator routes, server-backed workspace CRUD, server-backed resume profile, AI chat/generation interfaces, and a functional Pomodoro timer.

## Apply
1. Keep a backup of your current `Frontend` folder.
2. Replace the existing `Frontend` folder with this folder.
3. Keep your existing `Backend` folder unchanged. The backend in your current working project is newer than the backend bundled in the original starter archive, so this package intentionally contains only the updated frontend.
4. Copy your existing `Frontend/.env` if you already have one, or create it from `.env.example` and set `VITE_API_URL` to your backend URL.
5. From the `Frontend` directory run:

```bash
npm install
npm run dev
```

For production verification:

```bash
npm run build
```

## API assumptions
- Auth endpoints: `/api/auth/register`, `/api/auth/verify-email`, `/api/auth/resend-otp`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/get-me`.
- Workspace endpoints: `/api/hub/dashboard`, `/api/hub/items`, `/api/hub/ai/generate`, `/api/hub/ai/chat`.
- Email verification submits `{ email, otp }`; resend submits `{ email }`.

All authentication requests use `withCredentials: true` for the backend's HTTP-only cookies.
