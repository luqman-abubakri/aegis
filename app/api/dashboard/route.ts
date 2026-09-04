import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/lib/models/Interview";
import Feedback from "@/lib/models/Feedback";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing environment variable: JWT_SECRET");
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function GET() {
  try {
    // Get session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("aegis_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // Verify JWT
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.userId;

    if (typeof userId !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid session",
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