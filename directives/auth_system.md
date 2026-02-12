# Auth System Directive (Nexus)

## Overview
This directive defines the authentication strategy for the Nexus application using NextAuth.js v5 (Auth.js). It leverages Supabase for persistence and supports Google OAuth and Magic Link (Email) authentication.

## Strategy
- **Framework**: NextAuth.js v5 (Beta/Stable)
- **Database**: Supabase (PostgreSQL) via `@auth/supabase-adapter`
- **Session Strategy**: JWT (JSON Web Tokens) for stateless authentication across edge and serverless functions.
- **Providers**:
  - Google OAuth 2.0
  - Email (Magic Links)

## Configuration Requirements

### Environment Variables
Ensure the following are set in `.env.local`:
- `AUTH_SECRET`: Random 32-char string (run `openssl rand -base64 32`)
- `AUTH_GOOGLE_ID`: Google Cloud Console Client ID
- `AUTH_GOOGLE_SECRET`: Google Cloud Console Client Secret
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key (Server-side only)

### User Management
- **Adapter**: Supabase Adapter to sync users/sessions to the database.
- **Callbacks**:
  - `session`: Enrich session object with user ID and role.
  - `jwt`: Persist user ID and additional claims in the token.

## Implementation Details

### 1. Configuration (`auth.ts` / `route.ts`)
- Initialize `NextAuth` with providers and adapter.
- Export `handlers` (GET, POST), `auth`, and `signIn`/`signOut`.

### 2. Middleware (`middleware.ts`)
- Matcher: Protect `/dashboard/*` and other private routes.
- Logic:
  - If unauthenticated and accessing protected route -> Redirect to `/login`.
  - If authenticated -> Allow access.

### 3. OAuth State & PKCE (Custom Libs)
- Implement state generation and validation to prevent CSRF.
- Implement in-memory caching for PKCE verifiers during the handshake if needed (though NextAuth handles this internally, custom flows may require it).

## Reference
- [NextAuth.js v5 Documentation](https://authjs.dev/getting-started/migrating-to-v5)
- [Supabase Auth Adapter](https://authjs.dev/reference/adapter/supabase)
