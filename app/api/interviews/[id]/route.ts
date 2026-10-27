import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/lib/models/Interview";
import Feedback from "@/lib/models/Feedback";
import { getCurrentUserId } from "@/lib/currentUser";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();

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