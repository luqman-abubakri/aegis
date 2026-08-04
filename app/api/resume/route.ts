import { NextResponse } from "next/server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase";
import { analyzeResumeText, generateResumeInterviewQuestions } from "@/lib/grok";
import type { ResumeAnalysis, ResumeGeneratedInterview } from "@/types";

export const runtime = "nodejs";

type RequestBody = Record<string, unknown>;

function isRecord(value: unknown): value is RequestBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  let parser: {
    getText(): Promise<{ text: string }>;
    destroy(): Promise<void>;
  } | null = null;

  try {
    console.log("STEP 6: Starting PDF parse");

    // pdf-parse v2 exports a named class `PDFParse` (not a default-exported function).
    // Resolve it robustly across the installed package's export shape:
    //   1. named export `PDFParse`
    //   2. named export `pdfParse`
    //   3. default export
    //   4. callable module itself (v1-style)
    const pdfParseModule = (await import("pdf-parse")) as {
      PDFParse?: new (options: { data: Buffer | Uint8Array }) => {
        getText(): Promise<{ text: string }>;
        destroy(): Promise<void>;
      };
      pdfParse?: new (options: { data: Buffer | Uint8Array }) => {
        getText(): Promise<{ text: string }>;
        destroy(): Promise<void>;
      };
      default?: unknown;
    };

    const PDFParseClass =
      pdfParseModule.PDFParse ??
      pdfParseModule.pdfParse ??
      (typeof pdfParseModule.default === "function" &&
      (pdfParseModule.default as { name?: string }).name === "PDFParse"
        ? (pdfParseModule.default as new (options: { data: Buffer | Uint8Array }) => {
            getText(): Promise<{ text: string }>;
            destroy(): Promise<void>;
          })
        : undefined);

    if (typeof PDFParseClass !== "function") {
      throw new Error(
        "The PDF parser could not be loaded. The installed pdf-parse package does not expose a compatible PDFParse class."
      );
    }

    parser = new PDFParseClass({ data: buffer });

    const parsed = await parser.getText();
    const extractedText = parsed.text?.trim() ?? "";
    console.log("STEP 7: PDF parsed", {
      extractedCharacters: extractedText.length,
    });
    return extractedText;
  } catch (error) {
    console.error("========== RAW ERROR ==========");
    console.error(error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
      console.error("Cause:", error.cause);
    }
    console.dir(error, { depth: null });
    console.error("===============================");
    throw error;
  } finally {
    // Always release the underlying PDF.js document/worker resources.
    if (parser) {
      try {
        await parser.destroy();
      } catch (destroyError) {
        console.error("Failed to destroy the PDF parser:", destroyError);
      }
    }
  }
}

async function handleAnalyze(request: Request, body: RequestBody) {
  console.log("STEP 1: Request received");

  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!accessToken) {
    return jsonError("You must be signed in to analyze a resume.", 401);
  }

  const resumeId = getString(body.resumeId);
  const filePath = getString(body.filePath);
  const fileName = getString(body.fileName);

  if (!resumeId || !filePath) {
    return jsonError("Resume metadata is missing.", 400);
  }

  try {
    const supabase = createAuthenticatedSupabaseClient(accessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return jsonError("Your session has expired. Please sign in again.", 401);
    }

    console.log("STEP 2: User authenticated", { userId: user.id });

    console.log("STEP 3: Downloading file", { filePath });
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(filePath);

    if (downloadError || !fileBlob) {
      throw new Error(downloadError?.message ?? "Failed to download the resume file.");
    }

    console.log("STEP 4: File downloaded", {
      size: fileBlob.size,
      type: fileBlob.type,
    });

    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const header = buffer.subarray(0, 10).toString("utf8");
    console.log("STEP 5: Buffer created", {
      length: buffer.length,
      header,
    });

    if (!header.startsWith("%PDF-")) {
      console.error("WARNING: Buffer does not start with %PDF-. File may not be a valid PDF.");
    }

    const extractedText = await extractPdfText(buffer);

    if (!extractedText) {
      throw new Error("The uploaded PDF did not contain any extractable text.");
    }

    console.log("STEP 8: Starting Groq analysis");
    const analysis = await analyzeResumeText({
      resumeText: extractedText,
      fileName: fileName ?? "resume.pdf",
    });
    console.log("STEP 9: Groq analysis complete");

    console.log("STEP 10: Generating interview");
    const generatedInterview = await generateResumeInterviewQuestions({
      analysis,
      resumeText: extractedText,
    });

    const payload: ResumeAnalysis & { generatedInterview: ResumeGeneratedInterview } = {
      ...analysis,
      generatedInterview,
    };

    console.log("STEP 11: Updating database");
    const { error: updateError } = await supabase
      .from("resume_uploads")
      .update({ analysis: payload, parsed_data: { extractedText, fileName: fileName ?? "resume.pdf" } })
      .eq("id", resumeId)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    console.log("STEP 12: Success");
    return NextResponse.json({ success: true, analysis: payload });
  } catch (error) {
    console.error("========== RAW ERROR ==========");
    console.error(error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
      console.error("Cause:", error.cause);
    }
    console.dir(error, { depth: null });
    console.error("===============================");
    throw error;
  }
}

export async function POST(request: Request) {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch (error) {
    console.error("========== RAW ERROR ==========");
    console.error(error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
      console.error("Cause:", error.cause);
    }
    console.dir(error, { depth: null });
    console.error("===============================");
    body = null;
  }

  if (!body || !isRecord(body)) {
    return jsonError("Request body must be a JSON object.", 400);
  }

  const action = getString(body.action);
  if (action !== "analyze") {
    return jsonError("Unsupported action.", 400);
  }

  return handleAnalyze(request, body);
}
