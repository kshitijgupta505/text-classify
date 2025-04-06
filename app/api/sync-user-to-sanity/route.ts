import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2025-03-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      clerkId, 
      email, 
      firstName, 
      lastName, 
      imageUrl 
    } = body;

    // Validate required fields
    if (!clerkId) {
      return NextResponse.json({ message: 'Clerk ID is required' }, { status: 400 });
    }

    // Comprehensive search to check for existing user
    const existingUser = await sanityClient.fetch(
      `*[_type == "user" && (clerkId == $clerkId || email == $email)]{
        _id, 
        _type,
        clerkId, 
        email, 
        firstName, 
        lastName, 
        imageUrl
      }`,
      { clerkId, email }
    );

    // If user exists (either by Clerk ID or email), update the document
    if (existingUser && existingUser.length > 0) {
      const userToUpdate = existingUser[0];
      try {
        const updatedUser = await sanityClient.patch(userToUpdate._id)
          .set({
            clerkId: clerkId || userToUpdate.clerkId,
            email: email || userToUpdate.email,
            firstName: firstName || userToUpdate.firstName,
            lastName: lastName || userToUpdate.lastName,
            imageUrl: imageUrl || userToUpdate.imageUrl,
          })
          .commit();

        return NextResponse.json({ 
          message: 'User updated in Sanity', 
          user: updatedUser 
        }, { status: 200 });
      } catch (updateError) {
        console.error('Error updating user in Sanity:', updateError);
        return NextResponse.json({ 
          message: 'Failed to update user in Sanity',
          error: updateError instanceof Error ? updateError.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Create user if not exists
    const sanityUser = {
      _type: 'user',
      clerkId,
      email: email || '',
      firstName: firstName || '',
      lastName: lastName || '',
      imageUrl: imageUrl || '',
    };

    try {
      const createdUser = await sanityClient.create(sanityUser);
      console.log('User created successfully:', createdUser);
      return NextResponse.json({ 
        message: 'User created in Sanity', 
        user: createdUser 
      }, { status: 200 });
    } catch (createError) {
      console.error('Error creating user in Sanity:', createError);
      return NextResponse.json({ 
        message: 'Failed to create user in Sanity',
        error: createError instanceof Error ? createError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Complete Sanity sync error:', error);
    return NextResponse.json({ 
      message: 'Unexpected error syncing user to Sanity',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
