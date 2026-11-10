import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { verifyAdminSessionToken, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

// Public routes accessible without athlete signing in
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/manifest.webmanifest(.*)',
  '/manifest.json(.*)',
  '/beyondlimits.apk(.*)',
  '/sw.js(.*)',
  '/favicon.ico(.*)',
  '/pwa-(.*)',
  '/apple-touch-icon(.*)',
  '/icon(.*)',
  '/api/reminders/cron(.*)',
  '/audio(.*)',
  '/voice(.*)',
  '/voices(.*)',
  '/assets(.*)',
  '/api/admin/login(.*)',
  '/api/admin/logout(.*)',
  '/api/settings/verify-gemini(.*)',
  '/api/chat(.*)',
  '/api/songs(.*)',
  '/api/workout/routines(.*)',
  '/admin(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;

  // 1. Guard /admin pages: require verified admin session cookie
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!(await verifyAdminSessionToken(adminToken))) {
      const signInUrl = new URL('/sign-in?tab=admin', request.url);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }

  // 2. Guard /api/admin endpoints (except login and logout)
  if (
    pathname.startsWith('/api/admin') &&
    !pathname.startsWith('/api/admin/login') &&
    !pathname.startsWith('/api/admin/logout')
  ) {
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!(await verifyAdminSessionToken(adminToken))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 3. Regular Clerk athlete auth protection
  if (!isPublicRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      return (await auth()).redirectToSignIn({ returnBackUrl: request.url });
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|manifest\\.json|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|wav|ogg|m4a|aac|apk)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
