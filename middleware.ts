import { clerkMiddleware, validateRequest } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

const customMiddleware = async (req) => {
  const { userId, sessionId, getToken } = req.auth;
  const isAdminPage = req.nextUrl.pathname.startsWith('/adminDashboard');

  if (isAdminPage) {
    // If not authenticated, redirect to sign-in
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }

    // Check user's role in the organization
    try {
      // Replace with your actual organization ID
      const orgId = process.env.CLERK_ORGANIZATION_ID;
      
      if (!orgId) {
        console.error('Organization ID not set in environment');
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // Get the user's membership in the organization
      const orgMemberships = await clerkClient.organizations.getOrganizationMembershipList({
        organizationId: orgId
      });

      // Find the current user's membership
      const userMembership = orgMemberships.find(member => member.publicUserData.userId === userId);

      // Check if user has admin role
      if (!userMembership || userMembership.role !== 'admin') {
        console.log('Non-admin user tried to access admin dashboard');
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // If we've made it here, the user is an admin
      return NextResponse.next();

    } catch (error) {
      console.error('Error checking admin status:', error);
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
};

export default clerkMiddleware({
  afterAuth: customMiddleware,
});

export const config = {
  matcher: [
    "/adminDashboard/:path*",
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
