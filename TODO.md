# AEGIS Production Fixes — Implementation Checklist

## Task: Restore Dashboard Statistics After Incremental Save Refactor

### Root Cause
The final save (`handleSave`) resolved the interview `status` via `resolveInterviewStatus(answeredQuestions, totalQuestions)`. When a user finished early (End Interview, timer expiry, or skipped questions), `answeredQuestions < totalQuestions`, so the status was set to `"partial"` — but the dashboard only aggregates `status = "completed"`. This broke all four dashboard metrics.

### Fix (final save pipeline only — `app/api/interview/route.ts`)
- [x] 1. Change `handleSave` status resolution:
  - 0 answers → `"incomplete"` (preserves empty-interview guard)
  - Any user-initiated finish with ≥1 answer → `"completed"` (even if some questions skipped)
- [x] 2. Remove now-unused `resolveInterviewStatus` import
- [x] 3. Run TypeScript checks

### Verification
- [ ] 1. A normally completed interview appears in the dashboard
- [ ] 2. An interview finished early (End Interview or timer) also appears
- [ ] 3. An abandoned interview with zero answers remains `"incomplete"` and is excluded
- [ ] 4. Interviews Completed increments correctly
- [ ] 5. Average Score updates
- [ ] 6. Total Practice Time updates
- [ ] 7. Streak updates
- [ ] 8. No duplicate interview rows are created

### Explicitly NOT changed (per requirements)
- Incremental save pipeline (`save-answer` action) — untouched
- Conversational voice implementation — untouched
- Dashboard queries — untouched
