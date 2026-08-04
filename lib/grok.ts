import "server-only";
import Groq from "groq-sdk";
import type {
  AnswerEvaluation,
  Difficulty,
  InterviewFeedback,
  InterviewType,
  ResumeAnalysis,
  ResumeGeneratedInterview,
} from "@/types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

const SYSTEM_PROMPT = `You are an expert technical interviewer conducting a practice interview.
Your role is to:
1. Ask relevant interview questions based on the candidate's target role, interview type, and difficulty level.
2. Listen to (or read) the candidate's answers and provide constructive feedback.
3. Maintain natural interview flow with follow-up questions when appropriate.
4. Evaluate answers fairly and provide specific, actionable feedback.

Keep questions clear, concise, and appropriate for the level.`;

const MODEL = "llama-3.3-70b-versatile";

function buildQuestionPrompt(params: {
  role: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  previousQuestions: { question: string; answer?: string }[];
}): string {
  const context =
    params.previousQuestions.length > 0
      ? `\nPrevious questions and answers:\n${params.previousQuestions
          .map(
            (q, i) =>
              `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer || "Not answered yet"}`
          )
          .join("\n\n")}\n\nBased on the candidate's previous answers, generate the next appropriate question.`
      : "";

  return `Role: ${params.role}
Interview Type: ${params.interviewType}
Difficulty Level: ${params.difficulty}
${context}

Generate a single interview question. Return ONLY the question text, nothing else.
The question should be specific to ${params.role} for a ${params.interviewType} interview at ${params.difficulty} level.
Do not number the question or add prefixes. Just return the question itself.`;
}

function buildEvaluationPrompt(params: {
  question: string;
  answer: string;
  role: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  context?: string;
}): string {
  return `Evaluate the following interview answer.

Role: ${params.role}
Interview Type: ${params.interviewType}
Difficulty: ${params.difficulty}
Question: ${params.question}
Candidate's Answer: ${params.answer}
${params.context ? `Context: ${params.context}` : ""}

Provide a JSON evaluation with the following structure:
{
  "score": <number between 0-100>,
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "improvementSuggestions": ["suggestion1", "suggestion2", ...],
  "modelAnswer": "A concise model/correct answer"
}

Be specific and constructive. Score should reflect the quality of the answer for the given difficulty level.
Return ONLY valid JSON, no other text.`;
}

function buildFeedbackPrompt(params: {
  role: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  evaluations: AnswerEvaluation[];
}): string {
  const evaluationsText = params.evaluations
    .map(
      (e, i) =>
        `Q${i + 1}: ${e.question}\nScore: ${e.score}\nStrengths: ${e.strengths.join(", ")}\nWeaknesses: ${e.weaknesses.join(", ")}`
    )
    .join("\n\n");

  return `Generate comprehensive final feedback for this interview.

Role: ${params.role}
Interview Type: ${params.interviewType}
Difficulty: ${params.difficulty}

Questions and Evaluations:
${evaluationsText}

Provide a JSON with the following structure:
{
  "overallScore": <number between 0-100>,
  "strengths": ["top strength 1", "top strength 2", ...],
  "areasForImprovement": ["area 1", "area 2", ...],
  "summary": "A paragraph summarizing overall performance and key takeaways"
}

Be honest and constructive. The overallScore should reflect performance across all questions.
Return ONLY valid JSON, no other text.`;
}

function getErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown Groq error";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function readScore(value: unknown): number {
  const score = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

async function groqCompletion(prompt: string, maxTokens = 1024): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured on the server");
  }

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
  });

  const text = completion.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq returned an empty response");
  }

  return text;
}

function parseJSON(text: string): Record<string, unknown> {
  const fencedJson = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fencedJson ?? text).trim();
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const json =
    firstBrace >= 0 && lastBrace >= firstBrace
      ? candidate.slice(firstBrace, lastBrace + 1)
      : candidate;
  const parsed: unknown = JSON.parse(json);

  if (!isRecord(parsed)) {
    throw new Error("Groq returned a JSON value that was not an object");
  }

  return parsed;
}

export async function generateInterviewQuestion(
  role: string,
  interviewType: InterviewType,
  difficulty: Difficulty,
  previousQuestions: { question: string; answer?: string }[] = []
): Promise<string> {
  try {
    const prompt = buildQuestionPrompt({
      role,
      interviewType,
      difficulty,
      previousQuestions,
    });

    const question = await groqCompletion(prompt);
    return question;
  } catch (error: unknown) {
    const detail = getErrorDetail(error);
    console.error("Groq question generation failed:", {
      detail,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      raw: error,
    });
    throw new Error(`Groq Question Generation Error: ${detail}`);
  }
}

export async function evaluateAnswer(params: {
  question: string;
  answer: string;
  role: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  context?: string;
}): Promise<Omit<AnswerEvaluation, "questionId">> {
  try {
    const prompt = buildEvaluationPrompt(params);
    const text = await groqCompletion(prompt);
    const parsed = parseJSON(text);

    return {
      question: params.question,
      answer: params.answer,
      score: readScore(parsed.score),
      strengths: readStringArray(parsed.strengths),
      weaknesses: readStringArray(parsed.weaknesses),
      improvementSuggestions: readStringArray(parsed.improvementSuggestions),
      modelAnswer: typeof parsed.modelAnswer === "string" ? parsed.modelAnswer : undefined,
    };
  } catch (error: unknown) {
    const detail = getErrorDetail(error);
    console.error("Groq answer evaluation failed:", {
      detail,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      raw: error,
    });
    throw new Error(`Groq Evaluation Error: ${detail}`);
  }
}

export async function generateFinalFeedback(params: {
  role: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  evaluations: AnswerEvaluation[];
}): Promise<InterviewFeedback> {
  try {
    const prompt = buildFeedbackPrompt(params);
    const text = await groqCompletion(prompt);
    const parsed = parseJSON(text);

    return {
      overallScore: readScore(parsed.overallScore),
      totalQuestions: params.evaluations.length,
      answeredQuestions: params.evaluations.length,
      strengths: readStringArray(parsed.strengths),
      areasForImprovement: readStringArray(parsed.areasForImprovement),
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      questionEvaluations: params.evaluations,
    };
  } catch (error: unknown) {
    const detail = getErrorDetail(error);
    console.error("Groq final feedback generation failed:", {
      detail,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      raw: error,
    });
    throw new Error(`Groq Feedback Generation Error: ${detail}`);
  }
}

function buildResumeAnalysisPrompt(params: {
  resumeText: string;
  fileName: string;
}): string {
  return `Analyze the following resume content and return ONLY valid JSON.

File name: ${params.fileName}
Resume text:
${params.resumeText}

Return a JSON object with this exact structure:
{
  "overallScore": 0,
  "atsScore": 0,
  "interviewReadiness": 0,
  "technicalSkills": ["skill"],
  "softSkills": ["skill"],
  "missingSkills": ["skill"],
  "strengths": ["strength"],
  "weaknesses": ["weakness"],
  "grammarIssues": ["issue"],
  "formattingIssues": ["issue"],
  "recommendations": ["recommendation"],
  "suggestedProjects": ["project"],
  "suggestedCertifications": ["certification"],
  "suggestedTechnologies": ["tech"]
}

Use realistic values based on the resume content. Keep arrays concise and relevant.`;
}

function buildResumeInterviewPrompt(params: {
  analysis: ResumeAnalysis;
  resumeText: string;
}): string {
  return `Using the candidate resume analysis below, generate an interview plan with 8 questions. Return ONLY valid JSON.

Analysis:
${JSON.stringify(params.analysis)}

Resume text:
${params.resumeText}

Return JSON in this structure:
{
  "title": "Interview Title",
  "description": "Brief description",
  "questions": [
    {
      "id": "q1",
      "type": "technical",
      "question": "Question text",
      "focus": "focus area"
    }
  ]
}`;
}

export async function analyzeResumeText(params: {
  resumeText: string;
  fileName: string;
}): Promise<ResumeAnalysis> {
  try {
    const text = await groqCompletion(buildResumeAnalysisPrompt(params), 4096);
    const parsed = parseJSON(text);

    return {
      overallScore: readScore(parsed.overallScore),
      atsScore: readScore(parsed.atsScore),
      interviewReadiness: readScore(parsed.interviewReadiness),
      technicalSkills: readStringArray(parsed.technicalSkills),
      softSkills: readStringArray(parsed.softSkills),
      missingSkills: readStringArray(parsed.missingSkills),
      strengths: readStringArray(parsed.strengths),
      weaknesses: readStringArray(parsed.weaknesses),
      grammarIssues: readStringArray(parsed.grammarIssues),
      formattingIssues: readStringArray(parsed.formattingIssues),
      recommendations: readStringArray(parsed.recommendations),
      suggestedProjects: readStringArray(parsed.suggestedProjects),
      suggestedCertifications: readStringArray(parsed.suggestedCertifications),
      suggestedTechnologies: readStringArray(parsed.suggestedTechnologies),
    };
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

export async function generateResumeInterviewQuestions(params: {
  analysis: ResumeAnalysis;
  resumeText: string;
}): Promise<ResumeGeneratedInterview> {
  try {
    const text = await groqCompletion(buildResumeInterviewPrompt(params), 4096);
    const parsed = parseJSON(text);

    return {
      title: typeof parsed.title === "string" ? parsed.title : "Resume-Based Interview",
      description:
        typeof parsed.description === "string"
          ? parsed.description
          : "Interview questions tailored to your resume.",
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.filter(
            (item): item is ResumeGeneratedInterview["questions"][number] =>
              isRecord(item) &&
              typeof item.question === "string" &&
              typeof item.type === "string" &&
              typeof item.focus === "string"
          )
        : [],
    };
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
