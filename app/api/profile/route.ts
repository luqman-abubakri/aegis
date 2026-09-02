import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/lib/models/User";
import Interview from "@/lib/models/Interview";
import Feedback from "@/lib/models/Feedback";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing environment variable: JWT_SECRET");
}

const secret = new TextEncoder().encode(JWT_SECRET);

/**
 * Get authenticated user ID from JWT session cookie
 */
async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aegis_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    if (typeof payload.userId !== "string") {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}

/**
 * GET /api/profile
 *
 * Returns:
 * - User profile
 * - Completed interviews
 * - Feedback records
 */
export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findById(userId).select(
      "_id email fullName avatarUrl createdAt updatedAt"
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    const [interviews, feedbackRecords] =
      await Promise.all([
        Interview.find({
          userId,
          status: "completed",
        })
          .sort({ createdAt: -1 })
          .lean(),

        Feedback.find({
          userId,
        })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

    return NextResponse.json({
      success: true,

      profile: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl || "",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },

      interviews: interviews.map((interview) => ({
        id: interview._id.toString(),
        role: interview.role,
        difficulty: interview.difficulty,
        interviewType: interview.interviewType,
        status: interview.status,
        score: interview.score ?? null,
        durationSeconds: interview.durationSeconds ?? 0,
        createdAt: interview.createdAt,
        completedAt: interview.completedAt ?? null,
      })),

      feedbackRecords: feedbackRecords.map(
        (feedback) => ({
          id: feedback._id.toString(),
          interviewId:
            feedback.interviewId.toString(),
          overallScore:
            feedback.overallScore ?? null,
          createdAt: feedback.createdAt,
        })
      ),
    });
  } catch (error) {
    console.error("[Profile API] GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load profile",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 *
 * Updates:
 * - fullName
 * - avatarUrl
 */
export async function PATCH(request: Request) {
  try {
    /**
     * 1. Authenticate user
     */
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    /**
     * 2. Read request body
     */
    const body = await request.json();

    const { fullName, avatarUrl } = body;

    /**
     * 3. Validate full name
     */
    if (
      fullName !== undefined &&
      typeof fullName !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name must be a string.",
        },
        { status: 400 }
      );
    }

    const trimmedName =
      typeof fullName === "string"
        ? fullName.trim()
        : undefined;

    if (trimmedName !== undefined) {
      if (!trimmedName) {
        return NextResponse.json(
          {
            success: false,
            message: "Full name cannot be empty.",
          },
          { status: 400 }
        );
      }

      if (trimmedName.length < 2) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Full name must be at least 2 characters.",
          },
          { status: 400 }
        );
      }

      if (trimmedName.length > 100) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Full name must be less than 100 characters.",
          },
          { status: 400 }
        );
      }
    }

    /**
     * 4. Validate avatar URL
     */
    if (
      avatarUrl !== undefined &&
      avatarUrl !== null &&
      typeof avatarUrl !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Avatar URL must be a string.",
        },
        { status: 400 }
      );
    }

    /**
     * 5. Build update object
     */
    const updateData: {
      fullName?: string;
      avatarUrl?: string;
    } = {};

    if (trimmedName !== undefined) {
      updateData.fullName = trimmedName;
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl || "";
    }

    /**
     * Nothing to update
     */
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No profile changes provided.",
        },
        { status: 400 }
      );
    }

    /**
     * 6. Connect to MongoDB
     */
    await dbConnect();

    /**
     * 7. Update user
     */
    const updatedUser =
      await User.findByIdAndUpdate(
        userId,
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      ).select(
        "_id email fullName avatarUrl createdAt updatedAt"
      );

    /**
     * 8. Check user exists
     */
    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    /**
     * 9. Return updated profile
     */
    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      profile: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl || "",
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error("[Profile API] PATCH error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update profile.",
      },
      { status: 500 }
    );
  }
}