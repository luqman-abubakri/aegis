import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/lib/models/User";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing environment variable: JWT_SECRET");
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function GET() {
  try {
    // Get the session cookie
    const cookieStore = await import("next/headers").then((mod) =>
      mod.cookies()
    );

    const token = (await cookieStore).get("aegis_session")?.value;

    // No session
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // Verify JWT
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.userId as string;

    if (!userId) {
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