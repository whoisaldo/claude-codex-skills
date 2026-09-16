# Briefs that get good reports

Load this when a report came back shallow, or when setting up a sweep.
Report quality tracks the brief, not the flags.

## The four lines that matter most

1. **Quote the exact strings.** Astra checks text literally. "status reads
   exactly `Invite sent to ali@example.com`" is a check; "the invite works"
   is a hope.
2. **State what the page is for.** "Checkout for a furniture store, desktop
   buyers" changes what counts as major versus nit.
3. **Say what to ignore.** Unfinished sections, known issues, lorem in the
   footer. Otherwise they crowd the findings list.
4. **One page or flow per run.** Parallel runs beat one sprawling brief.

## Copy-paste briefs

### After building or restyling a section
```
What changed: new pricing section with three tiers (Starter, Team, Business),
  monthly/annual toggle, one CTA per tier.
Checks:
  1. All three tier names and prices are visible without scrolling at this viewport.
  2. Click the "Annual" toggle: prices change and the "Save 20%" badge appears on Team.
  3. Each CTA is a real link/button with visible hover state.
  4. Nothing clips, overflows, or overlaps; the three cards are the same height.
Pass criteria: all four hold; badge text is exactly "Save 20%".
Ignore: the FAQ below the pricing section is unfinished.
```

### A form or multi-step flow
```
What changed: sign-up form with inline validation and a success toast.
Checks:
  1. Click "Create account" with everything empty: the email field shows
     "Enter your email" in red beneath it and the form does not submit.
  2. Fill email "ali@example.com" and password "hunter22!", submit: a toast
     reading "Check your inbox" appears within 2 s and the form resets.
  3. Press Tab from the email field: focus moves to the password field with a
     visible focus ring.
Pass criteria: 1-3 hold; no console errors during the flow.
```

### Compare against a design (`--reference design.png`)
```
What changed: implemented the attached dashboard design.
Checks:
  1. Compare the live page with the reference: report every deviation in
     layout, spacing, type size/weight, colour, and any element missing or extra.
  2. The sidebar is 240 px wide and the active item is highlighted.
Pass criteria: no major deviation from the reference; minor spacing drift under 4 px is acceptable.
```

### Responsive sweep (three parallel runs)
Same brief, three background calls with `--viewport 1440x900`, `1024x768`,
`390x844`. Add one line to the brief:
```
Viewport note: this is the <desktop | tablet | phone> run. Report layout that
only breaks at this width; the nav collapses to a menu button below 768 px.
```

### Dark mode (`--media dark`)
```
Checks:
  1. Every text/background pair is readable; call out anything below roughly
     4.5:1 (use `get styles` on suspects).
  2. No element keeps a light-mode background (white cards, white inputs).
  3. Images and logos have dark-mode variants or sit acceptably on dark.
```

### Regression re-check (`--effort high`, after a fix)
```
What changed: fixed the project-name overflow (now truncates with an ellipsis).
Checks:
  1. Re-check only the "Longest project name" card: the text is clipped inside
     the card with an ellipsis and a title tooltip on hover.
Pass criteria: no overflow at 1440x900; do not re-audit the rest of the page.
```

### Exploratory QA before hand-off
```
What changed: first complete version of the settings area.
Checks:
  1. Visit every nav item and click every control once; note anything that
     does nothing, errors, or looks broken.
  2. Fill each form with plausible data and submit; report the outcome.
Pass criteria: no blockers or majors; list minors for triage.
```

## Reading the findings

- `blocker` / `major`: fix before showing the user.
- `minor`: fix if cheap; otherwise list it in your report.
- `nit`: taste. Weigh it against the design intent; do not churn on it.
- `likely_cause` is a hypothesis in CSS/markup terms. Confirm it in the code
  before applying; Astra cannot read the stylesheet unless `--project` was set.
- A finding whose cited screenshot does not show the problem is a miss.
  Trust the screenshot.

## Failure modes → fixes

| Symptom | Fix |
|---|---|
| Report is shallow, generic praise | Brief lacked concrete checks. Quote strings, name elements, add "Ignore:" |
| Verdict `blocked`, "could not find element" | Your selector or label was wrong or the page changed; give Astra visible text ("the button labelled 'Send invite'") not CSS classes |
| Verdict `blocked`, login wall | Log in state is not shared. Point `--url` at a page that needs no auth, or seed a session cookie via `agent-browser cookies set` before the run (manual) |
| `pass` but you can see a defect | Add it as an explicit check; Astra prioritises the brief |
| Findings about areas you did not touch | Add them to "Ignore:", or fix them anyway if they are real |
| Run takes > 20 min | Split the brief; drop to `--effort high` for re-checks |
| Screenshot is blank or white | Page needed more load time. Add "wait for the text '...' before the first screenshot" |
| Hover/focus states "not verified" | Ask for them explicitly: "hover the CTA and screenshot it" |
| Different results run to run | Animations or async data. Ask Astra to `wait` for a specific element/text before judging |
