import mongoose from "mongoose";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { dbConnect } from "@/lib/dbConnect";
import ResumeUpload from "@/lib/models/ResumeUpload";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing environment variable: JWT_SECRET");
}

const secret = new TextEncoder().encode(JWT_SECRET);

async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("aegis_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    return typeof payload.userId === "string"
      ? payload.userId
      : null;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

function getCloudinaryUrls(publicId: string): string[] {
  const urls = [
    cloudinary.url(publicId, {
      secure: true,
      resource_type: "raw",
      type: "upload",
    }),
  ];

  if (!/\.pdf$/i.test(publicId)) {
    urls.push(
      cloudinary.url(`${publicId}.pdf`, {
        secure: true,
        resource_type: "raw",
        type: "upload",
      })
    );
  }

  return urls;
}

function getSafeFileName(fileName: string): string {
  const safeFileName = fileName
    .replace(/[\r\n"]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  return safeFileName || "resume.pdf";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!mongoose.isObjectIdOrHexString(id)) {
      return Response.json(
        { success: false, message: "Invalid resume ID." },
        { status: 400 }
      );
    }

    await dbConnect();

    const resume = await ResumeUpload.findOne({
      _id: id,
      userId,
    });

    if (!resume) {
      return Response.json(
        { success: false, message: "Resume not found." },
        { status: 404 }
      );
    }

    let assetResponse: Response | null = null;
    let retrievalError: unknown;

    for (const url of getCloudinaryUrls(resume.publicId)) {
      try {
        const response = await fetch(url);

        if (response.ok) {
          assetResponse = response;
          break;
        }

        retrievalError = new Error(
          `Cloudinary returned HTTP ${response.status}`
        );
      } catch (error) {
        retrievalError = error;
      }
    }

    if (!assetResponse?.body) {
      console.error("Resume PDF retrieval failed:", {
        resumeId: id,
        publicId: resume.publicId,
        error: retrievalError,
      });

      return Response.json(
        {
          success: false,
          message: "The resume PDF could not be retrieved.",
        },
        { status: 500 }
      );
    }

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${getSafeFileName(
        resume.fileName
      )}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });

    const contentLength = assetResponse.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new Response(assetResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[Resume View API] Error:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to retrieve the resume PDF.",
      },
      { status: 500 }
    );
  }
}
