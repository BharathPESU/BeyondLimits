import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes accessible without signing in
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/reminders/cron(.*)',
  '/audio(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
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
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|wav|ogg|m4a|aac)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
