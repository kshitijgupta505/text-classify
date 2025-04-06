// pages/api/webhooks/clerk-user-create.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@sanity/client';
import { Webhook } from 'svix';
import { buffer } from 'micro';

// Sanity client configuration
const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2021-03-25',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  // Log entire request for debugging
  console.log('Webhook Received:', {
    method: req.method,
    headers: req.headers,
    body: req.body
  });

  // Verify this is a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify Clerk webhook
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    return res.status(500).json({ message: 'Webhook secret not configured' });
  }

  try {
    // Get raw body
    const rawBody = await buffer(req);

    const wh = new Webhook(webhookSecret);
    const payload = wh.verify(
      rawBody.toString(),
      req.headers as any
    ) as any;

    console.log('Verified Payload:', payload);

    // We only want to handle user.created events
    if (payload.type !== 'user.created') {
      console.log('Not a user creation event');
      return res.status(200).json({ message: 'Not a user creation event' });
    }

    // Extract user data from Clerk webhook payload
    const userData = payload.data;
    console.log('User Data:', userData);

    // Prepare user document for Sanity
    const sanityUser = {
      _type: 'user',
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      email: userData.email_addresses[0]?.email_address || '',
      clerkUserId: userData.id,
      profileImageUrl: userData.profile_image_url || '',
    };

    // Create user in Sanity
    const result = await sanityClient.create(sanityUser);
    console.log('Sanity User Creation Result:', result);

    return res.status(200).json({ message: 'User created in Sanity', result });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(400).json({ 
      message: 'Webhook error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Disable body parsing to use raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};
