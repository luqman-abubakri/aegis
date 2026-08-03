# AEGIS - Interview Session Repair

## Steps

### 1. Delete Gemini
- [x] Delete `lib/gemini.ts`
- [x] Remove `@google/generative-ai` from `package.json`

### 2. Implement Grok Service
- [x] Implement `lib/grok.ts` with groq-sdk
  - `generateInterviewQuestion()`
  - `evaluateAnswer()`
  - `generateFinalFeedback()`

### 3. Update API Route
- [x] Update `app/api/interview/route.ts` to use `lib/grok.ts`

### 4. Fix Session Page
- [x] Rewrite `app/interview/session/page.tsx` with proper JSX

### 5. Build & Verify
- [ ] Run `npm run build`
- [ ] Fix any remaining errors
