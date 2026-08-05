# AEGIS — Interview Reliability Fixes

## Investigation Complete — Root Causes Found

### BUG #1 — Finish Interview Unreliable
- [x] No atomic duplicate-execution guard (stale closure on `status`)
- [x] `generateFeedback()` blocks on `loading` and empty answers → silently fails
- [x] Voice mode double-executes finish (`handleVoiceEndCall` + `onCallEnded`)
- [x] `finishInterviewRef` starts as no-op, can miss early `onCallEnded`
- [x] `saveInterview` stale-closure bug (async `setState` feedback)
- [x] Orphaned redirect `setTimeout` not cleaned up
- [x] No `router.refresh()` before redirect

### BUG #2 — Timer Unreliable
- [x] Decrement-based countdown drifts (browser throttling)
- [x] Timer keeps running during finish → can trigger duplicate finish
- [x] `autoFinishTriggeredRef` never resets on failure → interview stuck
- [x] No `visibilitychange` handling
- [x] Two separate intervals (useInterview + session page)

## Implementation Steps

- [x] **hooks/useInterview.ts** — Added refs for latest state (answers, config, duration), `isFinishingRef` atomic guard, new `finishInterview()` method, fixed `generateFeedback`/`saveInterview` stale closures, added `resetFinishing()`
- [x] **app/interview/session/page.tsx** — Replaced timer with timestamp-based implementation, atomic finish guard, progress states, disabled button, stops voice on finish, fixed voice double-fire, resets auto-finish on failure, cleans up redirect timeout, `router.refresh()`, fixed useEffect deps, added `finishCompletedRef` to prevent post-completion duplicate
- [x] **app/api/interview/route.ts** — Allowed empty evaluations in feedback/save (prevent data loss on 0-answer finish), fixed division-by-zero on empty answers
- [x] **hooks/useVapi.ts** — Added `callEndedRef` guard so `onCallEnded` fires once per call
- [x] Verified all `useEffect` dependency arrays — no stale closures, stable callbacks, refs for mutable state
- [x] Verified `npm run build` — compiled successfully (TypeScript passed, all routes generated)
- [ ] Manual test: rapid clicking, tab switching, voice mode, text mode, 0-answer finish, timer expiry
