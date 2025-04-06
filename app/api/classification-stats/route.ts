import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get query parameters (if any)
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "7", 10);

    const convex = getConvexClient();
    
    // Get classification results from your Convex database
    const results = await convex.query(api.classifications.getRecentStats, {
      userId,
      days
    });

    // Format the data for the chart
    const dates = [];
    for (let i = (days - 1); i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const formattedData = dates.map(date => {
      const dayStats = results.find(item => item.date === date) || {
        legitimate: 0,
        spam: 0,
        phishing: 0
      };
      
      return {
        date,
        legitimate: dayStats.legitimate || 0,
        spam: dayStats.spam || 0,
        phishing: dayStats.phishing || 0
      };
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching classification stats:", error);
    return NextResponse.json(
      { error: "Failed to retrieve classification statistics" },
      { status: 500 }
    );
  }
}
