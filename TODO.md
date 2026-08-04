# AEGIS - PDF Parsing Fix Tracking

## Root Cause
- Installed `pdf-parse@2.4.5` is a **v2 rewrite** that exports a **named class `PDFParse`** (with `getText()`/`destroy()` methods).
- The old code expected the **v1 default-exported callable function** (`pdf(buffer).then(r => r.text)`).
- `pdfParseModule.default` is `undefined` in v2 → the old detection threw "The PDF parser could not be loaded."

## Plan Steps
- [x] Investigate installed pdf-parse version and exports.
- [x] Confirm root cause (v1 → v2 breaking API change).
- [x] Rewrite `extractPdfText()` in `app/api/resume/route.ts` to use `PDFParse` v2 class API.
- [x] Preserve `extractPdfText(buffer: Buffer): Promise<string>` interface.
- [x] Ensure parser cleanup via `destroy()`.
- [x] Keep existing error handling and step logging.
- [x] Verify the full resume analysis pipeline works end-to-end.

## Verification
- `pdf-parse@2.4.5` exports a named `PDFParse` class (v2 API), NOT a default-exported function.
- Runtime test with a real PDF buffer: `new PDFParse({ data })` → `getText()` → extracted text, `destroy()` succeeded.
- `npx tsc --noEmit` produced no errors for `app/api/resume/route.ts`.
