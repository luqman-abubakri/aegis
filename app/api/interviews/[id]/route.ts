import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import mongoose from "mongoose";

import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/lib/models/Interview";
import Feedback from "@/lib/models/Feedback";

export const runtime = "nodejs";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing environment variable: JWT_SECRET");
}

const secret = new TextEncoder().encode(JWT_SECRET);

async function getAuthenticatedUserId(): Promise<string | null> {
  const token = (await cookies()).get("aegis_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    return typeof payload.userId === "string"
      ? payload.userId
      : null;
  } catch (error) {
    console.error("[Interview Delete API] JWT verification failed:", error);
    return null;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid interview ID" },
        { status: 400 }
      );
    }

    await dbConnect();

    const interview = await Interview.findOne({
      _id: id,
      userId,
    });

    if (!interview) {
      return NextResponse.json(
        { success: false, message: "Interview not found" },
        { status: 404 }
      );
    }

    await Promise.all([
      Feedback.deleteMany({
        interviewId: interview._id,
        userId,
      }),
      Interview.deleteOne({
        _id: interview._id,
        userId,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Interview deleted successfully",
    });
  } catch (error) {
    console.error("[Interview Delete API] Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete interview" },
      { status: 500 }
    );
  }
}