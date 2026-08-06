import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

function parseEnv(envPath) {
  const text = fs.readFileSync(envPath, "utf8");
  const lines = text.split(/\r?\n/);
  const out = {};
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    out[key] = v;
  }
  return out;
}

const env = parseEnv(path.join(repoRoot, ".env"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const API_BASE = "http://localhost:3001/api/interview";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

const TEST_EMAIL = `e2e_${Date.now()}@test.com`;
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = "E2E Test User";

let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label} ${detail ? `— ${detail}` : ""}`);
  }
}

async function postInterview(payload, accessToken) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return { status: res.status, body };
}

function buildEvaluation(i) {
  return {
    questionId: `q_${i}`,
    question: `Test question ${i}`,
    answer: `Test answer ${i}`,
    score: 70 + (i % 5) * 5,
    strengths: ["Clear communication"],
    weaknesses: ["Needs more detail"],
    improvementSuggestions: ["Add examples"],
    coachingMessage: `Coaching for ${i}`,
  };
}

function buildFeedback(evaluations, totalQuestions, answeredQuestions) {
  const overallScore = Math.round(
    evaluations.reduce((s, e) => s + e.score, 0) / (evaluations.length || 1)
  );
  return {
    overallScore,
    totalQuestions,
    answeredQuestions,
    strengths: ["Good"],
    areasForImprovement: ["More detail"],
    summary: `Completed ${answeredQuestions} of ${totalQuestions} questions.`,
    questionEvaluations: evaluations,
  };
}

async function queryInterviews(userId, status) {
  const q = supabase.from("interviews").select("*").eq("user_id", userId);
  if (status) q.eq("status", status);
  const { data, error } = await q;
  return { data, error };
}

async function queryFeedback(userId) {
  const { data, error } = await supabase
    .from("feedback")
    .select("id, interview_id, overall_score, summary, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data, error };
}

async function main() {
  console.log("=== E2E Test: Save Pipeline & Dashboard Metrics ===\n");
  console.log(`Test user: ${TEST_EMAIL}`);

  // 1. Sign up / sign in
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    options: { data: { full_name: TEST_NAME } },
  });

  let accessToken = null;
  let user = null;
  if (signUpData?.session) {
    accessToken = signUpData.session.access_token;
    user = signUpData.user;
  } else {
    // Email confirmation may be required — try sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (signInError) {
      console.error("Sign-in failed:", signInError.message);
      // Fall back to a direct sign-in if the user already exists
      process.exit(1);
    }
    accessToken = signInData.session.access_token;
    user = signInData.user;
  }

  if (!user || !accessToken) {
    console.error("Could not obtain test user session");
    process.exit(1);
  }
  console.log(`Signed in as user: ${user.id}\n`);

  // ============================================================
  // TEST 1: Complete Interview (all 5 questions answered)
  // ============================================================
  console.log("--- TEST 1: Complete Interview (all 5 answered) ---");
  const eval1 = [1, 2, 3, 4, 5].map(buildEvaluation);
  const feedback1 = buildFeedback(eval1, 5, 5);

  // Simulate incremental save-answer first (creates in_progress row)
  const saveAnswer1 = await postInterview({
    action: "save-answer",
    role: "Software Engineer",
    interviewType: "technical",
    difficulty: "intermediate",
    answers: eval1.slice(0, 1),
    totalQuestions: 5,
    durationSeconds: 120,
    startedAt: new Date(Date.now() - 300000).toISOString(),
  }, accessToken);
  check("save-answer returns success", saveAnswer1.body?.success === true, JSON.stringify(saveAnswer1.body));
  const interviewId1 = saveAnswer1.body?.interview?.id;
  check("save-answer returns interview id", !!interviewId1, JSON.stringify(saveAnswer1.body));

  // Verify in_progress row exists
  const prog1 = await queryInterviews(user.id, "in_progress");
  check("in_progress row exists after save-answer", (prog1.data || []).length === 1, `count=${(prog1.data || []).length}`);

  // Final save with all 5 answers (updates existing row)
  const saveFinal1 = await postInterview({
    action: "save",
    role: "Software Engineer",
    interviewType: "technical",
    difficulty: "intermediate",
    answers: eval1,
    totalQuestions: 5,
    durationSeconds: 300,
    startedAt: new Date(Date.now() - 300000).toISOString(),
    interviewId: interviewId1,
    feedback: feedback1,
  }, accessToken);
  check("save (complete) returns success", saveFinal1.body?.success === true, JSON.stringify(saveFinal1.body));
  check("save (complete) returns same interview id", saveFinal1.body?.interview?.id === interviewId1, `got=${saveFinal1.body?.interview?.id}`);

  // Verify updated row
  const { data: compRows1 } = await supabase.from("interviews").select("*").eq("id", interviewId1).single();
  check("status = completed", compRows1?.status === "completed", `got=${compRows1?.status}`);
  check("score saved", typeof compRows1?.score === "number" && compRows1.score > 0, `got=${compRows1?.score}`);
  check("duration_seconds saved", compRows1?.duration_seconds === 300, `got=${compRows1?.duration_seconds}`);
  check("completed_at populated", !!compRows1?.completed_at, `got=${compRows1?.completed_at}`);
  check("started_at preserved", !!compRows1?.started_at, `got=${compRows1?.started_at}`);
  check("feedback JSON saved", compRows1?.feedback && compRows1.feedback.overallScore !== undefined, JSON.stringify(compRows1?.feedback));
  check("updated_at populated", !!compRows1?.updated_at, `got=${compRows1?.updated_at}`);

  // Verify only ONE interview row total
  const all1 = await queryInterviews(user.id, null);
  check("only one interview row (no duplicates)", (all1.data || []).length === 1, `count=${(all1.data || []).length}`);

  // Verify feedback row
  const fb1 = await queryFeedback(user.id);
  check("feedback row created", (fb1.data || []).length === 1, `count=${(fb1.data || []).length}`);
  check("feedback overall_score matches", fb1.data?.[0]?.overall_score === feedback1.overallScore, `got=${fb1.data?.[0]?.overall_score}`);

  // Dashboard query simulation
  const dashComp1 = await queryInterviews(user.id, "completed");
  check("completed interview appears in dashboard query", (dashComp1.data || []).length === 1, `count=${(dashComp1.data || []).length}`);

  // ============================================================
  // TEST 2: Early Finish (2 questions answered)
  // ============================================================
  console.log("\n--- TEST 2: Early Finish (2 of 5 answered) ---");
  const eval2 = [1, 2].map(buildEvaluation);
  const feedback2 = buildFeedback(eval2, 5, 2);

  const saveAnswer2 = await postInterview({
    action: "save-answer",
    role: "Backend Engineer",
    interviewType: "behavioral",
    difficulty: "beginner",
    answers: eval2.slice(0, 1),
    totalQuestions: 5,
    durationSeconds: 60,
    startedAt: new Date(Date.now() - 120000).toISOString(),
  }, accessToken);
  const interviewId2 = saveAnswer2.body?.interview?.id;
  check("save-answer returns interview id", !!interviewId2, JSON.stringify(saveAnswer2.body));

  const saveFinal2 = await postInterview({
    action: "save",
    role: "Backend Engineer",
    interviewType: "behavioral",
    difficulty: "beginner",
    answers: eval2,
    totalQuestions: 5,
    durationSeconds: 90,
    startedAt: new Date(Date.now() - 120000).toISOString(),
    interviewId: interviewId2,
    feedback: feedback2,
  }, accessToken);
  check("save (early finish) returns success", saveFinal2.body?.success === true, JSON.stringify(saveFinal2.body));

  const { data: row2 } = await supabase.from("interviews").select("*").eq("id", interviewId2).single();
  check("early finish status = completed", row2?.status === "completed", `got=${row2?.status}`);
  check("early finish no duplicate row", (await queryInterviews(user.id, null)).data.length === 2, `count=${(await queryInterviews(user.id, null)).data.length}`);

  const dashComp2 = await queryInterviews(user.id, "completed");
  check("early finish appears in dashboard completed query", (dashComp2.data || []).length === 2, `count=${(dashComp2.data || []).length}`);

  // ============================================================
  // TEST 3: Zero-Answer Interview (abandoned)
  // ============================================================
  console.log("\n--- TEST 3: Zero-Answer Interview ---");
  const eval3 = [];
  const feedback3 = {
    overallScore: 0,
    totalQuestions: 5,
    answeredQuestions: 0,
    strengths: [],
    areasForImprovement: ["Complete the interview before requesting feedback"],
    summary: "No meaningful assessment could be generated because no interview questions were answered.",
    questionEvaluations: [],
  };

  const save3 = await postInterview({
    action: "save",
    role: "DevOps Engineer",
    interviewType: "system-design",
    difficulty: "advanced",
    answers: eval3,
    totalQuestions: 5,
    durationSeconds: 10,
    startedAt: new Date(Date.now() - 10000).toISOString(),
    feedback: feedback3,
  }, accessToken);
  check("save (zero answers) returns success", save3.body?.success === true, JSON.stringify(save3.body));

  const zeroId = save3.body?.interview?.id;
  const { data: row3 } = await supabase.from("interviews").select("*").eq("id", zeroId).single();
  check("zero-answer status = incomplete", row3?.status === "incomplete", `got=${row3?.status}`);

  const dashComp3 = await queryInterviews(user.id, "completed");
  check("zero-answer excluded from completed dashboard query", (dashComp3.data || []).length === 2, `count=${(dashComp3.data || []).length}`);

  // ============================================================
  // TEST 4: Dashboard Metrics Calculation
  // ============================================================
  console.log("\n--- TEST 4: Dashboard Metrics ---");
  const completedRows = dashComp3.data || [];

  // Interviews Completed
  const completedCount = completedRows.length;
  check("Interviews Completed = 2", completedCount === 2, `got=${completedCount}`);

  // Average Score (from feedback table for completed interviews)
  const fbAll = await queryFeedback(user.id);
  const scoredFeedback = (fbAll.data || []).filter((f) => typeof f.overall_score === "number");
  const avgScore = scoredFeedback.length > 0
    ? Math.round(scoredFeedback.reduce((a, b) => a + (b.overall_score || 0), 0) / scoredFeedback.length)
    : 0;
  const expectedAvg = Math.round((feedback1.overallScore + feedback2.overallScore) / 2);
  check("Average Score calculated correctly", avgScore === expectedAvg, `got=${avgScore}, expected=${expectedAvg}`);

  // Total Practice Time
  const totalSeconds = completedRows.reduce((sum, i) => sum + (i.duration_seconds || 0), 0);
  const expectedTotal = 300 + 90;
  check("Total Practice Time = 390s", totalSeconds === expectedTotal, `got=${totalSeconds}, expected=${expectedTotal}`);

  // Streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const oneDayMs = 86400000;
  const dayKeys = new Set(
    completedRows.map((d) => {
      const date = new Date(d.created_at);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    })
  );
  const sortedDays = Array.from(dayKeys)
    .map((key) => {
      const [y, m, d] = key.split("-").map(Number);
      return new Date(y, m - 1, d).getTime();
    })
    .sort((a, b) => b - a);
  const streakValid = sortedDays.length > 0 && sortedDays[0] >= todayMs - oneDayMs;
  check("Streak day valid (today or yesterday)", streakValid, JSON.stringify(sortedDays));

  console.log("\n===========================================");
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("===========================================");

  // Cleanup: delete test user's data
  console.log("\nCleaning up test data...");
  const { error: delErr } = await supabase.from("interviews").delete().eq("user_id", user.id);
  if (delErr) console.warn("Cleanup warning:", delErr.message);
  await supabase.auth.signOut();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
