---
name: auth-patterns
description: >-
  JWT authentication and RBAC patterns for the Document Search project.
  Use when implementing login, guards, protected routes, tokens, RBAC, or
  securing NestJS endpoints and React pages.
---

# Auth Patterns

## Current State

**Auth is not implemented.** All API endpoints are open. `ARCHITECTURE.md` specifies JWT + RBAC as the target.

When adding auth, follow the patterns below and match existing project conventions.

## Target Architecture

```
Login → JWT issued → Frontend stores token → Axios interceptor attaches Bearer header
                                              → NestJS JwtAuthGuard validates on protected routes
```

## Backend (NestJS)

### Module layout

Create `backend/src/auth/` following the module-per-feature pattern:

```
auth/
├── auth.module.ts
├── auth.controller.ts      # POST /api/auth/login, POST /api/auth/register
├── auth.service.ts
├── strategies/jwt.strategy.ts
├── guards/jwt-auth.guard.ts
├── guards/roles.guard.ts
└── dto/login.dto.ts
```

Register `AuthModule` in `app.module.ts`. Use `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`.

### JWT strategy pattern

- Extract token from `Authorization: Bearer <token>`
- Validate against `JWT_SECRET` from `ConfigService`
- Attach `{ userId, email, role }` to `request.user`

### Guard usage

Apply to controllers or individual routes:

```typescript
@UseGuards(JwtAuthGuard)
@Controller('api/documents')
export class DocumentsController { ... }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
async deleteDocument(...) { ... }
```

Public routes (login, register, health) stay unguarded.

### DTO validation

Use `class-validator` DTOs — global `ValidationPipe` is already configured in `main.ts` with `whitelist: true`.

### User entity (if adding)

Add `backend/src/database/entities/user.entity.ts`:

- `id` (uuid), `email` (unique), `passwordHash`, `role` (enum: `user` | `admin`)
- Register in `DatabaseModule` entities array
- **Production:** disable `synchronize`; use migrations

### CORS

`main.ts` already enables CORS with `credentials: true`. Keep `FRONTEND_URL` aligned when auth cookies are used (optional alternative to localStorage tokens).

## Frontend (React)

### Token storage

Prefer `localStorage` or `sessionStorage` for JWT. Avoid storing in Redux (persists in memory only).

### Axios interceptor (`frontend/src/services/api.ts`)

Add request interceptor:

```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

Handle 401 in response interceptor: clear token, redirect to login.

### Protected routes

Wrap routes in `App.tsx`:

```typescript
<Route element={<ProtectedRoute />}>
  <Route path="/upload" element={<DocumentUpload />} />
  ...
</Route>
```

`ProtectedRoute` checks token; redirects to `/login` if missing.

### Auth slice (optional)

Add `authSlice.ts` with `user`, `token`, `isAuthenticated`. Login thunk calls `POST /api/auth/login`.

## Environment Variables

```env
# backend/.env
JWT_SECRET=your-secret-min-32-chars
JWT_EXPIRES_IN=1d
```

Never commit secrets. Add to GitHub Actions secrets for CI.

## Security Checklist

- [ ] Hash passwords with bcrypt (never store plain text)
- [ ] Validate JWT on every protected endpoint
- [ ] Use `@Roles()` + `RolesGuard` for admin-only actions (delete, reindex)
- [ ] Rate-limit login endpoint
- [ ] Set short token expiry; consider refresh tokens for production

## Related Files

| File | Relevance |
|------|-----------|
| `backend/src/main.ts` | CORS, ValidationPipe |
| `frontend/src/services/api.ts` | Interceptor hook point |
| `memory-bank/systemPatterns.md` | Auth decision record |
