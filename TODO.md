# AEGIS Production Fixes — Implementation Checklist

## Task 1: Responsive Resume Page (`app/resume/page.tsx`)
- [x] 1. Audit resume page for horizontal scroll / overflow issues
- [x] 2. Add `overflow-x-hidden` to `<main>` root
- [x] 3. Responsive header: `text-3xl sm:text-4xl md:text-5xl`
- [x] 4. Responsive upload card padding: `p-6 sm:p-8 lg:p-12`
- [x] 5. Long filename wrap: `break-words` + `min-w-0`
- [x] 6. Action buttons stack on mobile: `w-full sm:w-auto`
- [x] 7. Analysis cards `min-w-0` + `overflow-hidden`
- [x] 8. Verify no horizontal scrolling anywhere

## Task 2: Empty Interview Scoring Fix
- [x] 1. `types/index.ts`: add `totalQuestions` to `InterviewConfig`
- [x] 2. Create `lib/incompleteFeedback.ts` (deterministic fallback)
- [x] 3. `hooks/useInterview.ts`: client guard for 0 answers
- [x] 4. `app/api/interview/route.ts`: server guard for 0 answers
- [x] 5. `app/api/interview/route.ts`: pass answered/total to Groq
- [x] 6. `lib/grok.ts`: improve prompt (completion block, skipped questions)
- [x] 7. `lib/grok.ts`: cap overallScore at 60 for partial interviews
- [x] 8. `app/api/interview/route.ts`: set status incomplete/partial/completed
- [x] 9. `app/interview/session/page.tsx` + `InterviewSetup.tsx`: populate `totalQuestions` via MAX_QUESTIONS
- [x] 10. Dashboard: verify incomplete/partial excluded from metrics (already filtered by status="completed")
- [ ] 11. Run TypeScript checks

## Task 3: Conversational Voice Interview System
- [x] 1. `types/index.ts`: add `coachingMessage` + `followUp` to `AnswerEvaluation`; add `currentQuestionIndex` to `InterviewState`
- [x] 2. `lib/grok.ts`: extend evaluation prompt & return to include `coachingMessage` + `followUp`
- [x] 3. `app/api/interview/route.ts`: parse `coachingMessage`/`followUp` in `parseEvaluation`; add `save-answer` action (incremental upsert); `save` accepts `interviewId` (update existing row)
- [x] 4. `hooks/useInterview.ts`: add `saveAnswerImmediately`, `advanceQuestion`, `isAdvancing`, `interviewId`, `currentQuestionIndex`; thread `interviewId` into save payload; reset new state
- [x] 5. `app/interview/session/page.tsx`: rewrite voice flow (evaluate → save → coach → auto-advance); voice command detection; "Next Question" button; `isAdvancing` lock; use `currentQuestionIndex` for progress
- [x] 6. `components/interview/InterviewChat.tsx`: display `coachingMessage` in evaluation card (text-mode parity)
- [x] 7. Run TypeScript checks (passed — no errors)
