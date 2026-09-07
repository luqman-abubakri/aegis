import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import type { UploadApiResponse } from "cloudinary";
import { dbConnect } from "@/lib/dbConnect";
import ResumeUpload from "@/lib/models/ResumeUpload";
import cloudinary from "@/lib/cloudinary";
import {
  analyzeResumeText,
  generateResumeInterviewQuestions,
} from "@/lib/grok";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing environment variable: JWT_SECRET");
}

const secret = new TextEncoder().encode(JWT_SECRET);

class ResumeProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ResumeProcessingError";
  }
}

/**
 * Get the authenticated user's ID from the aegis_session cookie.
 */
async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aegis_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.userId as string;

    if (!userId) {
      return null;
    }

    return userId;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Extract text from a PDF buffer.
 */
async function extractPdfText(buffer: Buffer) {
  // This is only a signature check, not complete PDF validation.
  const header = buffer.subarray(0, 5).toString("ascii");

  if (header !== "%PDF-") {
    throw new ResumeProcessingError(
      "The uploaded file does not have a valid PDF signature.",
      "INVALID_PDF_SIGNATURE",
      400
    );
  }

  let data;

  try {
    // Pass an independent Uint8Array to the legacy PDF.js parser.
    data = await pdfParse(Uint8Array.from(buffer));
  } catch (error) {
    console.error("[Resume API] PDF text extraction failed:", {
      error: error instanceof Error ? error.message : String(error),
      fileSize: buffer.length,
    });

    throw new ResumeProcessingError(
      "The PDF was received, but its text could not be extracted. It may use a PDF structure or encoding that this parser cannot read, or it may be a scanned image. Please upload a text-based PDF.",
      "PDF_TEXT_EXTRACTION_FAILED",
      422
    );
  }

  const text = data.text?.trim();

  if (!text || text.length < 50) {
    throw new ResumeProcessingError(
      "The PDF was read successfully, but it contains too little selectable text. Scanned or image-only resumes are not supported.",
      "PDF_TEXT_NOT_FOUND",
      422
    );
  }

  return text;
}

/**
 * POST /api/resume
 *
 * Actions:
 * - upload
 * - analyze
 * - delete
 */
export async function POST(request: Request) {
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

    const contentType = request.headers.get("content-type") || "";

    /*
     * ============================================================
     * UPLOAD RESUME
     * ============================================================
     */
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          {
            success: false,
            message: "No resume file was provided.",
          },
          { status: 400 }
        );
      }

      if (file.type !== "application/pdf") {
        return NextResponse.json(
          {
            success: false,
            message: "Only PDF resumes are supported.",
          },
          { status: 400 }
        );
      }

      if (file.size === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "The uploaded file is empty.",
          },
          { status: 400 }
        );
      }

      /*
       * Convert the browser File into a Buffer.
       */
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      /*
       * Extract text before uploading.
       * This prevents storing unusable PDFs.
       */
      const extractedText = await extractPdfText(buffer);

      await dbConnect();

      /*
       * Upload PDF to Cloudinary.
       *
       * resource_type: "raw" is important because the resume
       * is a PDF/document rather than an image.
       */
      let uploadResult: UploadApiResponse;

      try {
        uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "aegis/resumes",
              resource_type: "raw",
              public_id: `${Date.now()}-${file.name.replace(
                /\.pdf$/i,
                ""
              )}.pdf`,
            },
            (error, result) => {
              if (error) {
                reject(error);
                return;
              }

              if (!result) {
                reject(new Error("Cloudinary returned no upload result."));
                return;
              }

              resolve(result);
            }
          );

          uploadStream.end(buffer);
        });
      } catch (error) {
        console.error("[Resume API] Cloudinary resume upload failed:", error);
        throw new ResumeProcessingError(
          "The PDF was parsed, but it could not be stored in Cloudinary. Please try again.",
          "CLOUDINARY_UPLOAD_FAILED",
          502
        );
      }

      /*
       * Save resume metadata in MongoDB.
       */
      let resume;

      try {
        resume = await ResumeUpload.create({
          userId,
          fileName: file.name,
          fileUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          fileSize: file.size,
          mimeType: file.type,
          extractedText,
          parsedData: {
            extractedText,
            fileName: file.name,
          },
          analysis: null,
          uploadedAt: new Date(),
        });
      } catch (error) {
        console.error("[Resume API] MongoDB resume save failed:", error);

        try {
          await cloudinary.uploader.destroy(uploadResult.public_id, {
            resource_type: "raw",
          });
        } catch (cleanupError) {
          console.error(
            "[Resume API] Cloudinary cleanup after MongoDB failure failed:",
            cleanupError
          );
        }

        throw new ResumeProcessingError(
          "The PDF was uploaded, but its resume record could not be saved. Please try again.",
          "MONGODB_SAVE_FAILED",
          500
        );
      }

      return NextResponse.json({
        success: true,
        message: "Resume uploaded successfully.",
        resume: {
          id: resume._id.toString(),
          fileName: resume.fileName,
          fileUrl: resume.fileUrl,
          fileSize: resume.fileSize,
          mimeType: resume.mimeType,
          uploadedAt: resume.uploadedAt,
          analysis: resume.analysis,
        },
      });
    }

    /*
     * ============================================================
     * JSON ACTIONS
     * ============================================================
     */

    const body = await request.json();

    const { action } = body;

    /*
     * ============================================================
     * ANALYZE RESUME
     * ============================================================
     */
    if (action === "analyze") {
      const { resumeId } = body;

      if (!resumeId) {
        return NextResponse.json(
          {
            success: false,
            message: "Resume ID is required.",
          },
          { status: 400 }
        );
      }

      await dbConnect();

      /*
       * IMPORTANT:
       * Find by both _id and userId so one user cannot analyze
       * another user's resume.
       */
      const resume = await ResumeUpload.findOne({
        _id: resumeId,
        userId,
      });

      if (!resume) {
        return NextResponse.json(
          {
            success: false,
            message: "Resume not found.",
          },
          { status: 404 }
        );
      }

      /*
       * Use the text we already extracted during upload.
       *
       * This means we don't need to download the PDF from
       * Cloudinary every time we analyze it.
       */
      const resumeText =
        resume.extractedText ||
        resume.parsedData?.extractedText ||
        "";

      if (!resumeText || resumeText.length < 50) {
        return NextResponse.json(
          {
            success: false,
            message: "No readable resume text was found.",
          },
          { status: 400 }
        );
      }

      /*
       * Send resume text to Groq.
       */
      let analysis;
      let interviewQuestions;

      try {
        analysis = await analyzeResumeText({
          resumeText,
          fileName: resume.fileName,
        });

        interviewQuestions = await generateResumeInterviewQuestions({
          analysis,
          resumeText,
        });
      } catch (error: unknown) {
        console.error("[Resume API] Groq resume analysis failed:", error);

        const groqError = error as { status?: number; code?: string };

        if (
          groqError.status === 429 ||
          groqError.code === "rate_limit_exceeded"
        ) {
          throw error;
        }

        throw new ResumeProcessingError(
          "The resume was saved, but AI analysis failed. You can try analyzing it again.",
          "GROQ_ANALYSIS_FAILED",
          502
        );
      }

      /*
       * Save everything to MongoDB.
       */
      resume.analysis = {
        ...analysis,
        interviewQuestions,
        generatedInterview: interviewQuestions,
      };

      resume.parsedData = {
        ...(resume.parsedData || {}),
        extractedText: resumeText,
        fileName: resume.fileName,
      };

      await resume.save();

      return NextResponse.json({
        success: true,
        message: "Resume analyzed successfully.",
        analysis: resume.analysis,
        resume: {
          id: resume._id.toString(),
          fileName: resume.fileName,
          fileUrl: resume.fileUrl,
          uploadedAt: resume.uploadedAt,
        },
      });
    }

    /*
     * ============================================================
     * DELETE RESUME
     * ============================================================
     */
    if (action === "delete") {
      const { resumeId } = body;

      if (!resumeId) {
        return NextResponse.json(
          {
            success: false,
            message: "Resume ID is required.",
          },
          { status: 400 }
        );
      }

      await dbConnect();

      /*
       * Again, check userId so users can only delete their own
       * resumes.
       */
      const resume = await ResumeUpload.findOne({
        _id: resumeId,
        userId,
      });

      if (!resume) {
        return NextResponse.json(
          {
            success: false,
            message: "Resume not found.",
          },
          { status: 404 }
        );
      }

      /*
       * Delete PDF from Cloudinary.
       */
      if (resume.publicId) {
        try {
          await cloudinary.uploader.destroy(resume.publicId, {
            resource_type: "raw",
          });
        } catch (cloudinaryError) {
          /*
           * We don't want a Cloudinary deletion problem to leave
           * the user unable to delete the MongoDB record.
           */
          console.error(
            "Cloudinary deletion failed:",
            cloudinaryError
          );
        }
      }

      /*
       * Delete MongoDB record.
       */
      await ResumeUpload.deleteOne({
        _id: resume._id,
        userId,
      });

      return NextResponse.json({
        success: true,
        message: "Resume deleted successfully.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Invalid action.",
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("[Resume API] Error:", error);

    const apiError = error as {
      status?: number;
      code?: string;
      message?: string;
    };

    if (error instanceof ResumeProcessingError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          message: error.message,
        },
        { status: error.status }
      );
    }

    /*
     * Groq/API quota errors.
     */
    if (
      apiError.status === 429 ||
      apiError.code === "rate_limit_exceeded"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "AI usage limit reached. Please try again later.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          apiError.message ||
          "Something went wrong while processing your resume.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resume
 *
 * Returns all resumes belonging to the authenticated user.
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

    const resumes = await ResumeUpload.find({
      userId,
    })
      .sort({ uploadedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      resumes: resumes.map((resume) => ({
        id: resume._id.toString(),
        fileName: resume.fileName,
        fileUrl: resume.fileUrl,
        publicId: resume.publicId,
        fileSize: resume.fileSize,
        mimeType: resume.mimeType,
        uploadedAt: resume.uploadedAt,
        analysis: resume.analysis || null,
        parsedData: resume.parsedData || null,
      })),
    });
  } catch (error: unknown) {
    console.error("[Resume API] GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load resumes.",
      },
      { status: 500 }
    );
  }
}