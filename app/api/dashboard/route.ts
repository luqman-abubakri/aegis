import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/lib/models/Interview";
import Feedback from "@/lib/models/Feedback";
import { getCurrentUserId } from "@/lib/currentUser";

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    await dbConnect();

    const [interviews, feedbackRecords] = await Promise.all([
      Interview.find({ userId, status: "completed" })
        .sort({ createdAt: -1 })
        .lean(),
      Feedback.find({ userId }).sort({ createdAt: -1 }).lean(),
    ]);

    return NextResponse.json({
      success: true,
      interviews,
      feedbackRecords,
    });
  } catch (error) {
    console.error("[Dashboard API] Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load dashboard data",
      },
      { status: 500 }
    );
  }
}