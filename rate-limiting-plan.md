# Task: Implement Rate Limiting

This plan outlines the steps to add rate limiting to the Chat App's critical endpoints to protect the database and external service APIs from abuse (spam, brute-force, resource exhaustion).

## 1. Analysis & Risk Assessment

### High Priority Endpoints (Auth & Identity)
- `/api/auth/login`: Protect against brute-force attacks.
- `/api/auth/register`: Protect against automated account creation.
- `/api/auth/password-reset-request`: Protect against email bombing/spam.
- `/api/auth/forgot-reset`: Protect against token brute-forcing.

### Medium Priority Endpoints (App Logic & Costs)
- `/api/chats` (POST): Protect message history DB and Pusher message counts.
- `/api/calls/create-room`: Protect LiveKit minute usage/costs.
- `/api/stories` (POST): Protect MongoDB storage and Cloudinary bandwidth.
- `/api/url-metadata`: Protect against SSRF scanning and resource exhaustion.

### Methodology
We will use **Upstash Ratelimit** (Redis-based) because:
1. It works perfectly with Next.js (Edge and Node runtimes).
2. It is distributed (works across multiple serverless instances).
3. It provides a generous free tier suitable for development.

## 2. Infrastructure Setup
- [ ] Install dependencies: `@upstash/ratelimit` and `@upstash/redis`.
- [ ] Create a `lib/ratelimit.ts` utility to initialize the Ratelimit instances.
- [ ] Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.local`.

## 3. Implementation Phases

### Phase 1: Shared Utility & Middlewares
- Create `lib/ratelimit.ts` with reusable configurations:
    - `authLimiter`: 5 requests per 10 minutes (for login/register).
    - `messageLimiter`: 10 requests per 10 seconds (for chat).
    - `generalLimiter`: 60 requests per 1 minute (for other writes).

### Phase 2: Protecting Auth Endpoints
- Implement rate limiting in `app/api/auth/login/route.ts`.
- Implement rate limiting in `app/api/auth/register/route.ts`.
- Implement rate limiting in `app/api/auth/password-reset-request/route.ts`.

### Phase 3: Protecting Application Logic
- Implement rate limiting in `app/api/chats/route.ts` (POST).
- Implement rate limiting in `app/api/stories/route.ts` (POST).
- Implement rate limiting in `app/api/calls/create-room/route.ts`.

### Phase 4: Monitoring & UI Feedback
- Ensure `429 Too Many Requests` responses include helpful headers (`X-RateLimit-Reset`).
- Update the frontend (if needed) to handle 429 errors gracefully (e.g., toast notification: "Slow down! Try again in X seconds").

## 4. Verification & Testing
- Use `curl` or Postman to simulate rapid-fire requests to protected endpoints.
- Verify headers and status codes.
- Ensure rate limits are per-IP (for auth) or per-User (for authenticated actions).

## Questions for User
- Do you already have an Upstash account? (I can provide a link to sign up for free).
- Should we use a local Redis for development, or go straight to Upstash?
