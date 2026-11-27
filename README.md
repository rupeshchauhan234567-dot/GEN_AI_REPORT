# AI Career & Learning Hub

A React + Vite frontend and Express + MongoDB backend that extends the supplied AI Interview Report Generator. The existing interview report flow and Puppeteer resume-PDF export are retained.

## Included in this delivery

- Existing account registration/login/logout, cookie-based JWT auth, protected routes and interview report generation/history/deletion/PDF export.
- New responsive CareerHub workspace UI with dashboard, quick links and mobile sidebar.
- MongoDB-backed, user-owned notes, tasks, flashcards, study planner entries, bookmarks, career goals and job application records.
- Groq-backed structured generation endpoints for quizzes, flashcards, notes, summaries, career roadmaps, JD analysis, project ideas, cover letters and portfolio descriptions.
- Groq study chat endpoint.
- Quiz question navigation, answer selection, scoring, review and retake.
- Flashcard flip interaction.
- Pomodoro timer.
- Pagination/search for workspace item listing, per-user ownership filters, API rate limit and health endpoint.
- `.env.example` files and Render blueprint.

## Not yet implemented / requires additional integration

This is an incremental working extension, not a claim that every item in the original master specification is complete. The following require further implementation and/or credentials:
- Email OTP verification, OAuth2 Gmail mail delivery, forgot/reset/change password, rotating refresh-token family and account deletion.
- ImageKit avatar upload/profile image lifecycle.
- Full resume builder history/templates/ATS comparison/PDF export from the new Resume Studio (the old interview-report PDF workflow remains).
- True conversational mock-interview session engine with turn-by-turn evaluation and saved session reports.
- PDF file upload/extraction/chapter splitting; the summarizer currently accepts pasted extracted text.
- PDF-based quiz and chat context upload.
- Recharts analytics, calendar sync/reminders, live FX API and unit converter.
- Third-party verified internship/job feed. AI-generated career suggestions are suggestions, not live listings.
- Automated end-to-end tests against live MongoDB, Groq, ImageKit, Gmail and Render credentials.

The new Resume Studio explicitly saves a local browser draft only. Do not treat it as MongoDB-backed resume storage.

## Requirements

- Node.js 22.12+ (Puppeteer dependency in the existing backend requires a modern Node runtime).
- MongoDB Atlas or local MongoDB.
- Groq API key and model access.

## Local setup

1. Copy `Backend/.env.example` to `Backend/.env`.
2. Set `MONGO_URI`, `JWT_SECRET` (at least 32 random characters), `GROQ_API_KEY`, and `CORS_ORIGINS=http://localhost:5173`.
3. Set `GROQ_MODEL` to a model enabled for your Groq account.
4. Copy `Frontend/.env.example` to `Frontend/.env` and set `VITE_API_URL=http://localhost:3000`.
5. Install and run each app:

```bash
cd Backend
npm install
npm run dev
```

In a second terminal:

```bash
cd Frontend
npm install
npm run dev
```

Backend health: `http://localhost:3000/api/health`.

## Render deployment

- Deploy the backend as a Node web service with root directory `Backend`, build `npm install`, start `npm start`.
- Add `MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY`, and comma-separated `CORS_ORIGINS` including the exact deployed frontend origin.
- Deploy the frontend as a static site with root directory `Frontend`, build `npm install && npm run build`, publish directory `dist`.
- Set `VITE_API_URL` to the backend service URL.
- `render.yaml` is a starting blueprint; configure secrets in Render's environment settings. Never commit actual `.env` files.

## Security notes

- Keep Groq and MongoDB credentials on the backend only.
- Existing auth uses a signed HttpOnly cookie and blacklist-based logout. It is not a refresh-token rotation implementation.
- Production cross-site cookie behavior depends on HTTPS and the frontend/backend domain arrangement.
- Workspace records are scoped by authenticated user ID. Do not expose unprotected API routes.

## Existing application paths

- `/` and `/dashboard`: new workspace dashboard.
- `/hub/:section`: workspace modules.
- `/legacy`: original interview generator home.
- `/interview/:interviewId`: original interview report detail page.
- `/login`, `/register`: existing auth pages.
