# TODO.md — Pending Items

> Captured items that need attention but are not yet in a phase plan.

---

## Research / Validation

- [ ] Evaluate GPT-4o-vision vs Gemini 1.5 Pro for floor plan geometry extraction — run test on a real commercial floor plan PDF to compare accuracy
- [ ] Review existing `nbc_rules.json` for completeness against IS 2190:2024 (all commercial building rules present?)
- [ ] Identify real commercial building floor plan sample for end-to-end testing

## Technical Spikes

- [ ] Verify Vercel's free tier file upload size limits (for PDF/image floor plans — these can be 5-20MB)
- [ ] Explore `pdf-lib` vs `puppeteer` for report generation (evaluate bundle size and Vercel compatibility)

## Product

- [ ] Define the exact IS 2190:2024 rules for commercial buildings (are they all in nbc_rules.json? need to verify)
- [ ] Design the "user confirmation" flow for when AI extraction is uncertain

---
