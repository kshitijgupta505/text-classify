import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clerkId } = body;
    
    if (!clerkId) {
      return NextResponse.json({ 
        message: 'Clerk ID is required' 
      }, { status: 400 });
    }
    
    // Replace with your actual Organization ID from Clerk Dashboard
    const orgId = process.env.CLERK_ORGANIZATION_ID;
    
    if (!orgId) {
      return NextResponse.json({ 
        message: 'Organization ID not configured' 
      }, { status: 500 });
    }

    try {
      // Check if organizations API is available
      if (!clerkClient.organizations) {
        // If using older version of Clerk SDK, use the organization method instead
        // @ts-ignore - This is for compatibility with different Clerk SDK versions
        const result = await clerkClient.organization.addMember({
          organizationId: orgId,
          userId: clerkId,
          role: 'basic_member'
        });
        
        return NextResponse.json({ 
          message: 'User added to organization successfully using legacy API',
          result
        }, { status: 200 });
      } else {
        // Using newer Clerk SDK version
        const result = await clerkClient.organizations.addMember({
          organizationId: orgId,
          userId: clerkId,
          role: 'basic_member'
        });
        
        return NextResponse.json({ 
          message: 'User added to organization successfully',
          result
        }, { status: 200 });
      }
    } catch (clerkError: any) {
      // Handle specific Clerk API errors
      if (clerkError.status === 422) {
        // User may already be a member
        return NextResponse.json({ 
          message: 'User is already a member of the organization',
          error: clerkError.message
        }, { status: 409 });
      }
      
      throw clerkError; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error('Error adding user to organization:', error);
    return NextResponse.json({ 
      message: 'Failed to add user to organization',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}
