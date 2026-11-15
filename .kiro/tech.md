# BeyondLimits — Technical Specification

## Technology Stack

### Frontend Framework
- **Next.js 15** (App Router)
- **React 19** (Server Components and Client Components)
- **TypeScript 5.9.3** (Strict Mode)
- **Tailwind CSS 4.1.11** (with postcss integration)

### Authentication
- **Clerk 7.9.25** (`@clerk/nextjs`)
- Multi-strategy auth: Email+Password, Google OAuth
- Edge Middleware route protection
- HTTP-only session cookies

### Database & Backend
- **Supabase** (`@supabase/supabase-js` 2.119.0)
- PostgreSQL database (Project: `roimbcfpjyqhtzlyspbb`)
- Row-Level Security (RLS) policies
- Automated triggers and stored procedures

### UI & Styling
- **Tailwind CSS 4** with `@tailwindcss/postcss`
- **Lucide React** (icons)
- **Motion 12.23.24** (animations)
- **class-variance-authority** + **clsx** + **tailwind-merge** (utility classes)

### Data Visualization
- **Recharts 3.10.1** (charts and graphs)

### 3D Graphics
- **Three.js 0.187.0** (fire visualization canvas)

### AI & External Services
- **Google Gemini AI** (`@google/genai` 3.0.0)
- **Tavily API** (web research for neuroscience insights)
- **Twilio** (SMS reminders, optional)
- **ntfy.sh** (mobile push notifications)

### Local Development Database
- **better-sqlite3 13.0.3** (local SQLite fallback)
- JSON file storage (`data/discipline-tracker-store.json`)

### Form Validation
- **Zod 4.6.7** (schema validation)
- **@hookform/resolvers 5.2.1** (React Hook Form integration)

### Mobile & PWA
- **Capacitor 8.6.0** (`@capacitor/core`, `@capacitor/android`)
- Progressive Web App with service worker (`public/sw.js`)

### Date & Time
- **date-fns 4.4.0** (date manipulation and formatting)

---

## Architecture Principles

### 1. Dual-Database Architecture

**Local Development**:
- Uses `data/discipline-tracker-store.json` for zero-config local development
- SQLite fallback via `better-sqlite3` for testing without Supabase
- Enabled by `lib/db.ts` database abstraction layer

**Production**:
- Supabase PostgreSQL (fully relational)
- Row-Level Security (RLS) enforced on all tables
- Automated triggers for streak calculation
- Real-time sync across devices

**Storage Engine Selection Logic** (`lib/db.ts`):
```typescript
// Automatically selects Supabase if NEXT_PUBLIC_SUPABASE_URL is set
// Falls back to local JSON/SQLite if not configured
const engine = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'supabase' : 'local';
```

### 2. Authentication & Authorization

**Zero-Bypass Route Protection**:
- All routes protected by default via `middleware.ts`
- Edge Middleware runs before any page or API route
- Unauthenticated users redirected to `/sign-in`

**Public Routes** (exceptions):
```typescript
[
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/manifest.webmanifest(.*)',
  '/sw.js(.*)',
  '/favicon.ico(.*)',
  '/pwa-(.*)',
  '/api/reminders/cron(.*)',
  '/assets(.*)',
]
```

**Clerk Integration**:
- `ClerkProvider` wraps entire app in `app/layout.tsx`
- `auth()` helper available in Server Components
- `useAuth()` hook available in Client Components
- Automatic session management and token refresh

### 3. User Data Scoping Rule

**CRITICAL SECURITY REQUIREMENT**:

> **ALL database queries that read or write user-specific data MUST be scoped by the authenticated user's ID.**

**Implementation Pattern**:

```typescript
// ✅ CORRECT: Scoped by user ID
const { userId } = await auth();
const records = await supabase
  .from('attendance_logs')
  .select('*')
  .eq('user_id', userId);

// ❌ WRONG: No user scoping (data leakage)
const records = await supabase
  .from('attendance_logs')
  .select('*');
```

**Tables Requiring User Scoping**:
- `users_profile` (via `clerk_user_id`)
- `attendance_logs` (via `user_id`)
- `user_streaks` (via `user_id`)
- `login_activity_logs` (via `user_id`)
- `workout_sessions` (via `user_id`)
- `user_challenges` (via `user_id`)
- `user_badges` (via `user_id`)
- `user_reminder_settings` (via `user_id`)

### 4. Row-Level Security (RLS)

**Supabase RLS Policies**:

All user-specific tables MUST have RLS enabled with policies like:

```sql
-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own records
CREATE POLICY "Users can view their own attendance logs"
ON public.attendance_logs
FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Policy: Users can only insert/update their own records
CREATE POLICY "Users can insert their own attendance logs"
ON public.attendance_logs
FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);
```

**RLS Tables**:
- ✅ `attendance_logs`
- ✅ `user_streaks`
- ✅ `login_activity_logs`
- ✅ `workout_sessions`
- ✅ `workout_exercise_logs` (scoped via `session_id` → `user_id`)
- ✅ `user_challenges`
- ✅ `user_badges`
- ✅ `user_reminder_settings`

**Public Tables** (no RLS):
- `exercises_catalog` (read-only reference data)
- `challenges_catalog` (read-only reference data)
- `badges_catalog` (read-only reference data)
- `daily_motivations` (shared daily content, not user-specific)

---

## Database Schema Overview

### Core Tables

#### `users_profile`
Clerk user account profiles.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `clerk_user_id` | TEXT | Unique Clerk user ID |
| `email` | TEXT | User email |
| `full_name` | TEXT | Full name |
| `short_name` | VARCHAR(10) | Short display name (e.g., "CD", "BR") |
| `timezone` | TEXT | User timezone (default: `Asia/Kolkata`) |

#### `attendance_logs`
Daily self-control tracking records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `user_id` | UUID | Foreign key to `users_profile` |
| `date` | DATE | Attendance date (YYYY-MM-DD) |
| `relapsed` | BOOLEAN | `false` = Clean, `true` = Relapsed |
| `reason` | TEXT | Reflection text (min 3 chars if relapsed) |
| `trigger_category` | VARCHAR(100) | Trigger category |
| `emotion_state` | VARCHAR(100) | Emotional state |
| `urge_intensity` | SMALLINT | 1-10 scale |
| `control_note` | TEXT | Additional notes |

**Unique Constraint**: `(user_id, date)` — one record per user per day.

#### `user_streaks`
Real-time streak statistics.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | Primary key, foreign key to `users_profile` |
| `current_login_streak` | INT | Consecutive daily logins |
| `longest_login_streak` | INT | All-time best login streak |
| `current_clean_streak` | INT | Consecutive clean days |
| `longest_clean_streak` | INT | All-time best clean streak |
| `current_workout_streak` | INT | Consecutive workout completions |
| `longest_workout_streak` | INT | All-time best workout streak |
| `streak_freeze_count` | INT | Available streak freezes (default: 1) |

#### `workout_sessions`
Completed workout sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to `users_profile` |
| `started_at` | TIMESTAMPTZ | Session start time |
| `completed_at` | TIMESTAMPTZ | Session end time |
| `total_duration_sec` | INT | Total workout duration |
| `exercises_completed_count` | SMALLINT | Number of exercises completed (max 12) |
| `status` | VARCHAR(20) | `in_progress`, `completed`, `abandoned` |
| `workout_date` | DATE | Date of workout |

#### `workout_exercise_logs`
Per-exercise performance logs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `session_id` | UUID | Foreign key to `workout_sessions` |
| `exercise_id` | VARCHAR(50) | Foreign key to `exercises_catalog` |
| `actual_duration_sec` | INT | Actual time spent on exercise |
| `completed` | BOOLEAN | Whether exercise was completed |

---

## API Routes Architecture

### Route Protection Pattern

All API routes MUST authenticate via Clerk:

```typescript
// app/api/some-route/route.ts
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Proceed with user-scoped logic
}
```

### Key API Routes

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|---------------|
| `/api/attendance` | GET | Fetch user's attendance records | ✅ |
| `/api/attendance` | POST | Create/update attendance record | ✅ |
| `/api/motivation` | GET | Generate daily AI motivation | ✅ |
| `/api/chat` | POST | AI coach chatbot | ✅ |
| `/api/workout/complete` | POST | Save completed workout session | ✅ |
| `/api/reminders/cron` | POST | Automated cron trigger (Vercel Cron) | ❌ (internal) |

---

## Automated Database Functions

### 1. `handle_user_daily_login(clerk_id, timezone, device)`

**Purpose**: Calculate consecutive daily login streaks.

**Trigger**: Called via API on user dashboard access.

**Logic**:
1. Check if user logged in today (in their timezone)
2. If first login today:
   - Check if yesterday had a login (in sequence)
   - If yes: increment `current_login_streak`
   - If no: reset `current_login_streak` to 1
3. Update `longest_login_streak` if current exceeds it
4. Insert/update `login_activity_logs` for today

### 2. `handle_workout_completed()` Trigger

**Purpose**: Automatically update workout streaks on session completion.

**Trigger**: PostgreSQL trigger on `INSERT` into `workout_sessions` where `status = 'completed'`.

**Logic**:
1. Check if workout completed today
2. Check if previous day had a workout
3. If consecutive: increment `current_workout_streak`
4. If not consecutive: reset to 1
5. Update `longest_workout_streak` if current exceeds it
6. Advance user challenge progress (e.g., 7-Day Workout Blitz)

---

## TypeScript & Type Safety

### Strict Mode Configuration

**`tsconfig.json`**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### Centralized Type Definitions

All types defined in `lib/types.ts`:

**Key Interfaces**:
- `FriendProfile` — User profile data
- `AttendanceRecord` — Daily attendance log
- `FriendStats` — User statistics
- `UserProgressStats` — Comprehensive user analytics
- `WeeklyAchievementComparison` — Duo weekly comparison
- `DailyMotivationRecord` — AI-generated motivation
- `PhoneReminderConfig` — Reminder settings
- `DashboardPayload` — Full dashboard data structure
- `MotivationalChatMessage` — Chat message structure

### Zod Schema Validation

**Usage Pattern**:
```typescript
import { z } from 'zod';

const attendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  relapsed: z.boolean(),
  reason: z.string().min(3).optional(),
  triggerCategory: z.string(),
  emotionState: z.string(),
  urgeIntensity: z.number().min(1).max(10),
});

// In API route
const body = attendanceSchema.parse(await request.json());
```

---

## Development Workflow

### Local Development

```bash
# Install dependencies
bun install  # or: npm install

# Start dev server
bun run dev  # Runs on http://localhost:3000

# Type check
./node_modules/.bin/tsc --noEmit

# Lint
npm run lint

# Build for production
bun run build

# Start production server
bun run start
```

### Environment Variables

**Required** (`.env.local`):
```ini
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://roimbcfpjyqhtzlyspbb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# AI Services (Optional)
GEMINI_API_KEY=AIza...
TAVILY_API_KEY=tvly-...

# App URL
APP_URL=http://localhost:3000
```

### Database Migration Workflow

1. **Local Development**: Uses JSON file (`data/discipline-tracker-store.json`)
2. **Production**: Configure Supabase environment variables
3. **Migration**: Run `supabase/setup_complete.sql` in Supabase SQL Editor
4. **Seed Data**: Included in `supabase/seed.sql`

---

## Performance Optimization

### Server Components First
- Use React Server Components by default
- Client Components only when interactive state needed
- Mark with `'use client'` directive at top of file

### Image Optimization
- Use Next.js `<Image>` component for exercise images
- Serve from `/public/assets/aistudio/exercises/`
- Pre-optimized high-resolution PNGs

### Database Query Optimization
- Indexed columns: `user_id`, `date`, `clerk_user_id`
- Use `select('specific, columns')` instead of `select('*')`
- Pagination for large result sets

---

## Security Checklist

### Authentication
- ✅ Edge Middleware protects all routes
- ✅ Public routes explicitly whitelisted
- ✅ Session tokens HTTP-only cookies
- ✅ Automatic token refresh via Clerk

### Database Security
- ✅ Row-Level Security (RLS) enabled on user tables
- ✅ All queries scoped by `user_id`
- ✅ Prepared statements (SQL injection prevention)
- ✅ Input validation via Zod schemas

### API Security
- ✅ Rate limiting on sensitive endpoints (TODO: implement)
- ✅ CORS configuration for API routes
- ✅ No sensitive data in client-side bundles
- ✅ Environment variables for secrets

### Content Security
- ✅ XSS prevention via React's JSX escaping
- ✅ CSP headers in production (TODO: implement)
- ✅ HTTPS-only in production

---

## Testing Strategy

### Unit Tests (TODO)
- Utility functions in `lib/`
- Schema validation functions
- Streak calculation logic

### Integration Tests (TODO)
- API routes with mocked Clerk auth
- Database operations with test Supabase project
- Workout timer accuracy

### E2E Tests (TODO)
- Authentication flow (sign-in, sign-up)
- Attendance logging flow
- Workout completion flow
- Dashboard rendering with real data

---

## Deployment

### Vercel (Recommended)

**Configuration** (`vercel.json`):
```json
{
  "buildCommand": "next build",
  "devCommand": "next dev -p 3000",
  "framework": "nextjs"
}
```

**Environment Variables**:
- Set all `.env.local` variables in Vercel Dashboard
- Use production Supabase URL and keys
- Set `APP_URL` to production domain

**Cron Jobs**:
- Configure Vercel Cron for `/api/reminders/cron`
- Schedule: Daily at 8:00 PM IST

### PWA Deployment
- Service worker (`public/sw.js`) automatically served
- Manifest at `/manifest.webmanifest`
- Icons in `/public/` directory

---

## Code Style Guidelines

### File Naming
- Components: PascalCase (e.g., `DisciplineDashboardClient.tsx`)
- Utilities: kebab-case (e.g., `supabase-service.ts`)
- API Routes: lowercase (e.g., `app/api/attendance/route.ts`)

### Component Structure
```typescript
'use client'; // Only if client component

import { ... } from '...';

interface ComponentProps {
  // Props interface
}

export default function Component({ prop }: ComponentProps) {
  // Component logic
  
  return (
    // JSX
  );
}
```

### API Route Structure
```typescript
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Business logic
    return Response.json({ data: result });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Troubleshooting Common Issues

### Issue: Middleware not protecting routes
**Solution**: Check `middleware.ts` matcher configuration and public routes list.

### Issue: Supabase queries returning empty results
**Solution**: Verify RLS policies and ensure queries scoped by `user_id`.

### Issue: Clerk session not persisting
**Solution**: Check cookie settings and `NEXT_PUBLIC_CLERK_*` environment variables.

### Issue: Workout timer not accurate
**Solution**: Verify `setInterval` usage and browser tab focus state.

### Issue: Daily reminders not triggering
**Solution**: Check Vercel Cron configuration and API route logs.

---

## Future Technical Improvements

### Performance
- Implement React Query for client-side caching
- Add Redis caching layer for frequently accessed data
- Optimize bundle size with dynamic imports

### Observability
- Add error tracking (Sentry)
- Implement logging infrastructure (Datadog/LogRocket)
- Performance monitoring (Vercel Analytics)

### Testing
- 80%+ test coverage on critical paths
- Automated E2E testing in CI/CD pipeline
- Load testing for concurrent users

### Infrastructure
- Blue-green deployment strategy
- Database backup automation
- Disaster recovery plan

---

## Key Technical Constraints

| Constraint | Rationale |
|------------|-----------|
| **TypeScript Strict Mode** | Catch type errors at compile time |
| **User ID Scoping** | Prevent data leakage between users |
| **Row-Level Security** | Defense-in-depth security model |
| **Edge Middleware** | Fast, global authentication checks |
| **Server Components First** | Reduce client bundle size |
| **Supabase RLS** | Database-level access control |
| **Zod Validation** | Runtime type safety for API inputs |
| **Progressive Enhancement** | Core features work without JavaScript |

---

## Contact & Maintenance

**Primary Developer**: Bharath CD  
**Email**: cdbharath234@gmail.com  
**GitHub**: [@bharathpesu](https://github.com/bharathpesu)

**Tech Stack Updates**: Update this document when major dependencies change.  
**Last Updated**: 2026-01-08
