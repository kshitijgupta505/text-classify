'use client';
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export function SanityUserSync() {
  const { isLoaded, user } = useUser();
  
  useEffect(() => {
    async function syncUserToSanity() {
      // Enhanced logging for initial state
      console.log('User Sync - Initial State:', {
        isLoaded,
        userExists: !!user,
        userId: user?.id,
      });

      // Only proceed if user is loaded and exists
      if (!isLoaded) {
        console.log('User not yet loaded, skipping sync');
        return;
      }

      if (!user) {
        console.log('No user found, skipping sync');
        return;
      }
      
      try {
        const userSyncData = {
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          imageUrl: user.imageUrl || '',
        };

        console.log('Attempting to sync user data:', userSyncData);

        // Sync user to Sanity
        const sanityResponse = await fetch('/api/sync-user-to-sanity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userSyncData),
        });

        // Check Sanity sync response
        const sanityResponseText = await sanityResponse.text();
        console.log('Sanity Sync Raw Response:', {
          status: sanityResponse.status,
          responseText: sanityResponseText
        });

        let sanityResponseData;
        try {
          sanityResponseData = JSON.parse(sanityResponseText);
        } catch (parseError) {
          console.error('Failed to parse Sanity sync JSON:', {
            error: parseError,
            responseText: sanityResponseText
          });
        }

        // Validate responses
        if (!sanityResponse.ok) {
          console.error('Sanity sync failed:', {
            status: sanityResponse.status,
            responseData: sanityResponseData
          });
        }

        console.log('User sync process completed');
      } catch (error) {
        console.error('Comprehensive Error during user sync:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
      }
    }
    
    syncUserToSanity();
  }, [isLoaded, user]); // Correct dependencies
  
  return null;
}
