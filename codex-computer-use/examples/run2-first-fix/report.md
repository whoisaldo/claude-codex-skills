# codex-computer-use report

- Target: http://127.0.0.1:8792/
- Viewport: 1440x900
- Model: gpt-6-astra (max)
- Thread: 01a0ab97-c9ee-7e91-b9ef-2c05ff69b57f
- Elapsed: 198.8s
- Run dir: /private/tmp/codex-probe/e2e-fixed

## Verdict: FAIL

The header and invite confirmation passed, and the Notes text has readable contrast. At 1440×900, the project card expands instead of showing the required ellipsis; the email placeholder also has low contrast. No console or page errors were observed.

## Checks

| # | Check | Status | Evidence | Screenshot |
|---|---|---|---|---|
| 1 | Header shows 'Probe Dashboard' and Overview, Reports, Settings. | pass | The initial screenshot and snapshot show 'Probe Dashboard' and exactly three navigation links: 'Overview', 'Reports', 'Settings'. | ./shots/01-initial.png |
| 2 | Submitting ali@example.com displays the exact invite confirmation beneath the form. | pass | Filled @e6 with 'ali@example.com' and clicked 'Send invite' at @e7. The visible #status beneath the controls reads exactly 'Invite sent to ali@example.com'. | ./shots/03-after-submit.png |
| 3 | Card content stays contained and readable, with the project name clipped using an ellipsis. | fail | All five cards contain their content, with no page overflow. However, 'Supercalifragilisticexpialidocious Initiative' displays in full without an ellipsis. Notes text matches the secondary grey and measures 6.90:1 contrast; the initial email placeholder measures only 4.10:1. | ./shots/03-after-submit.png |

## Findings

### [major] Project card expands instead of truncating the name

In both initial and submitted states, .card.overflow .num displays the complete 'Supercalifragilisticexpialidocious Initiative' without an ellipsis. Its card measures 652.39px wide, while adjacent cards measure approximately 341.80px. The text and its container both measure 610.39px, so truncation never occurs. The full-name title attribute exists.

Likely cause: main uses grid-template-columns: 1fr 1fr 1fr, while .card retains min-width: auto. The nowrap value expands the third track to its intrinsic width. Setting .card to min-width: 0 or using repeat(3, minmax(0, 1fr)) would allow the existing ellipsis styles to take effect.

Screenshot: ./shots/03-after-submit.png

### [minor] Email placeholder has insufficient contrast

The initial #email::placeholder text 'email@example.com' uses #757575 on #0f1115 at 13.33px. Its measured contrast is 4.10:1, below the 4.5:1 threshold for normal text.

Likely cause: The placeholder retains a darker grey than the readable #9aa4b2 secondary text. Set an explicit ::placeholder color with sufficient contrast.

Screenshot: ./shots/01-initial.png

## Screenshots

- ./shots/01-initial.png
- ./shots/02-email-filled.png
- ./shots/03-after-submit.png
