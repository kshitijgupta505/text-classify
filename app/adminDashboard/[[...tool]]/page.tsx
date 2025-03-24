"use client";

import { NextStudio } from 'next-sanity/studio';
import config from '../../../sanity.config';
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function StudioPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  useEffect(() => {
    // Check if user is loaded and either not logged in or not admin
    if (isLoaded) {
      if (!user) {
        router.push("/sign-in");
      } else if (user.id !== 'user_2snp0RkHIZ820xckK1xRJVorBRD') {
        router.push("/dashboard");
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, isLoaded, router]);

  // Show loading state until we confirm user is admin
  if (!isLoaded || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Verifying access...</h2>
          <p className="text-gray-500">Please wait while we authenticate your credentials.</p>
        </div>
      </div>
    );
  }

  // Only render the studio if user is authorized
  return <NextStudio config={config} />;
}
