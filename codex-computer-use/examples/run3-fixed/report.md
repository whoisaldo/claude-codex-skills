# codex-computer-use report

- Target: http://127.0.0.1:8792/
- Viewport: 1440x900
- Model: gpt-6-astra (max)
- Thread: 01a0ab9b-56bb-7662-8b96-af35a104f829
- Elapsed: 171.5s
- Run dir: /private/tmp/codex-probe/e2e-fixed2

## Verdict: PASS

All three checks passed at 1440×900. Initial and submitted states showed no visible defects, and both console and page-error logs were empty.

## Checks

| # | Check | Status | Evidence | Screenshot |
|---|---|---|---|---|
| 1 | Header shows 'Probe Dashboard' and three nav links: Overview, Reports, Settings. | pass | Header visibly reads 'Probe Dashboard' with exactly three navigation links: 'Overview', 'Reports', and 'Settings'. | /private/tmp/codex-probe/e2e-fixed2/shots/01-initial.png |
| 2 | Fill ali@example.com and click 'Send invite'; verify the exact status beneath the form. | pass | Filled @e6 with 'ali@example.com' and clicked 'Send invite' at @e7. The visible #status beneath the controls reads exactly 'Invite sent to ali@example.com'. | /private/tmp/codex-probe/e2e-fixed2/shots/03-after-submit.png |
| 3 | Card content stays contained, row widths match, the project name has an ellipsis, and all text is readable. | pass | All five cards are approximately 445.33 px wide, differing by less than 0.02 px from browser rounding. Content stays inside card boundaries; page scrollWidth equals the 1440 px viewport. The project name visibly ends in an ellipsis, with overflow:hidden and text-overflow:ellipsis measured on .card.overflow .num. The 'email@example.com' placeholder is readable at 7.49:1 contrast; secondary card text measures 6.90:1. | /private/tmp/codex-probe/e2e-fixed2/shots/01-initial.png |

## Findings

None.
## Screenshots

- /private/tmp/codex-probe/e2e-fixed2/shots/01-initial.png
- /private/tmp/codex-probe/e2e-fixed2/shots/02-email-filled.png
- /private/tmp/codex-probe/e2e-fixed2/shots/03-after-submit.png
