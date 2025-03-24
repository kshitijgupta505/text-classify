import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Create a custom middleware function that checks for admin routes
const customMiddleware = (req) => {
  const { userId } = req.auth;
  const isAdminPage = req.nextUrl.pathname.startsWith('/adminDashboard');

  if (isAdminPage) {
    // If not authenticated, redirect to sign-in
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }

    // If authenticated but not admin, redirect to regular dashboard
    if (userId !== 'user_2snp0RkHIZ820xckK1xRJVorBRD') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Continue with the request
  return NextResponse.next();
};

// Export middleware with the custom function applied after Clerk middleware
export default clerkMiddleware({
  afterAuth: customMiddleware,
});

// Keep your existing matcher, but add the adminDashboard paths
export const config = {
  matcher: [
    // Admin dashboard routes
    "/adminDashboard/:path*",
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
