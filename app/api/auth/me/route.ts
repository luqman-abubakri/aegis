import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/lib/models/User";
import { getCurrentUserId } from "@/lib/currentUser";

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    await dbConnect();

    // Find the user
    const user = await User.findById(userId).select(
      "_id email fullName avatarUrl createdAt updatedAt"
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.fullName,
        avatarUrl: user.avatarUrl || "",
      },
    });
  } catch (error) {
    console.error("Session verification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Invalid or expired session",
      },
      { status: 401 }
    );
  }
}