# INTERVYOU.AI — UI ITERATION
## HERO TYPING ANIMATION + CARD COLOR REFINEMENT + LOGO

This is a UI/UX iteration of the existing Intervyou.ai redesign.

The application is already functional and the current redesign looks good.

IMPORTANT: This remains a PRESENTATION-ONLY task.

DO NOT modify, refactor, rewrite, or replace any application logic, including:

- Authentication
- API routes
- Database/MongoDB logic
- Groq/Grok integration
- Vapi integration
- Resume upload/analysis
- Interview generation/evaluation
- Scoring
- Dashboard calculations
- Profile functionality
- State management
- Existing routes/navigation
- Forms and their functionality

Only change UI, styling, typography, colors, layout, branding, and animations.

---

# 1. HERO — REPLACE CURRENT ANIMATION

Remove the current animated/scroll-based hero animation.

Replace the hero headline animation with a clean typing animation using the existing text:

**"Ace every technical interview"**

Type it character-by-character, pause briefly when complete, then optionally delete and repeat.

Use a simple blinking vertical cursor in:

`#F97316`

The headline itself should remain:

`#111111`

Do NOT use glitch effects, bouncing, scrambling, gradients, 3D effects, or excessive animation.

Reuse the existing headline text/component where possible instead of creating unnecessary duplicate text.

Keep the existing hero CTA and functionality unchanged.

---

# 2. LOGO — REPLACE BRAIN CIRCUIT

The official Intervyou.ai logo is:

`/logo.png`

Search the UI for BrainCircuit/Lucide icons being used as the PRODUCT/BRAND LOGO and replace them with `/logo.png`.

This includes:

- Navbar
- Footer
- Sign-in
- Sign-up
- Authentication forms
- Profile forms
- Interview forms
- Resume forms
- Dashboard UI
- Loading/auth screens
- Any other place where BrainCircuit represents the application brand

Do NOT replace BrainCircuit if it is being used as a genuine functional feature icon rather than the product logo.

Do NOT create, redesign, regenerate, or modify the logo.

Maintain the original aspect ratio and size it appropriately for each location.

For authentication forms specifically, the logo at the top of the form must use `/logo.png`.

Do not change authentication or form functionality.

---

# 3. CARD COLOR SYSTEM

The current orange + white + black combination is too strong when used throughout the entire application.

Keep orange as the PRIMARY ACCENT, not the default card color.

Use this palette:

Primary orange:
`#F97316`

Orange hover:
`#EA580C`

Main background:
`#F7F7F5`

Card background:
`#FFFFFF`

Secondary surface:
`#F1F1EE`

Warm neutral:
`#EEECE7`

Primary text:
`#111111`

Muted text:
`#666666`

Subtle text:
`#888888`

Border:
`#D9D9D4`

Dark contrast:
`#111111`

---

# 4. CARD DESIGN

For the Dashboard, Profile, Interview, Resume, History, and other application sections:

Prefer:

- White cards
- Off-white cards
- Warm neutral cards
- Subtle gray backgrounds
- Thin borders
- Strong typography
- Generous spacing

Do NOT make every card orange or black.

Do NOT make cards switch from white to orange on hover.

Hover states should be subtle:

`#FFFFFF → #F7F7F5`

or

`#F7F7F5 → #F1F1EE`

You may use subtle border changes and small orange accents.

---

# 5. ORANGE USAGE

Use `#F97316` selectively for:

- Primary CTAs
- Active states
- Selected states
- Progress indicators
- Important highlights
- Small status indicators
- Score highlights
- Focus states
- Hover icon accents
- Typing cursor

Orange should communicate:

**ACTION / ACTIVE / IMPORTANT / PROGRESS / FOCUS**

It should NOT dominate the interface.

---

# 6. TEXT CONTRAST

Fix areas where text is white and only becomes black on hover.

Important text must be readable by default.

Use:

Primary:
`#111111`

Secondary:
`#666666`

Muted:
`#888888`

White text should only be used on intentionally dark backgrounds.

Do not make readability depend on hover.

---

# 7. APPLICATION-SPECIFIC COLORS

### Dashboard
Background: `#F7F7F5`
Cards: `#FFFFFF`
Secondary cards: `#F1F1EE`
Orange: accents/progress only.

### Profile
Main card: `#FFFFFF`
Secondary sections: `#F7F7F5` / `#F1F1EE`
Orange: actions and active states.

### Interview
Workspace: `#F7F7F5`
Question/answer cards: `#FFFFFF`
Secondary panels: `#F1F1EE`
Orange: active/focus/progress.

### Resume
Upload area: `#FFFFFF`
Analysis panels: `#F1F1EE`
Background: `#F7F7F5`
Orange: important actions/highlights.

### Interview History
Use clean editorial rows with white/off-white surfaces and subtle borders.
Use small orange indicators for active/in-progress states instead of coloring entire rows.

### Scores
Use large black numbers with restrained orange accents.
Use neutral progress tracks with orange fills.
Do NOT use giant orange score cards, circular gauges, gradients, or glowing meters.

---

# 8. DARK SECTIONS

Dark cards/sections can still be used intentionally.

Use:

`#111111`

with:

- White text
- Orange accents

Reserve these primarily for:

- Important CTA sections
- Special highlighted panels
- AI/interviewer moments
- High-contrast content

Do not make the entire application dark.

---

# 9. DESIGN DISTINCTION

The landing page can remain bold and expressive.

The actual application should feel calmer and more functional.

LANDING PAGE:
Bold + expressive + premium

APPLICATION:
Calm + focused + professional

The overall feeling should be:

**EDITORIAL + TECHNICAL + PREMIUM + CALM + CONFIDENT**

Not a generic AI dashboard.

---

# 10. VALIDATION

After making the changes:

- Verify the old hero animation is removed.
- Verify the typing animation works smoothly.
- Verify the cursor does not cause layout shift.
- Verify `/logo.png` replaces all branding BrainCircuit icons.
- Verify authentication forms still work.
- Verify text is readable without hover.
- Verify cards no longer rely heavily on orange.
- Verify Dashboard, Profile, Interview, Resume, and History feel visually consistent.
- Verify mobile responsiveness.
- Verify no horizontal overflow.
- Verify all existing functionality remains completely unchanged.

This is a visual iteration only.

DO NOT change the underlying application.