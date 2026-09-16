# codex-computer-use report

- Target: http://127.0.0.1:8791/
- Viewport: 1440x900
- Model: gpt-6-astra (max)
- Thread: 01a0ab8a-cd88-7e32-9542-1603d1f76dc3
- Elapsed: 168.0s
- Run dir: /private/tmp/codex-probe/e2e

## Verdict: FAIL

At 1440×900, the header and invite confirmation pass. The layout fails because the project name overflows its card and the Notes paragraph is nearly invisible; console and page-error logs were empty.

## Checks

| # | Check | Status | Evidence | Screenshot |
|---|---|---|---|---|
| 1 | Header shows 'Probe Dashboard' and links Overview, Reports, Settings. | pass | The header visibly shows "Probe Dashboard" and exactly three navigation links: "Overview", "Reports", "Settings". | /private/tmp/codex-probe/e2e/shots/01-initial.png |
| 2 | Submitting ali@example.com shows the exact invite confirmation. | pass | Filled @e6 with "ali@example.com" and clicked "Send invite" @e7. The visible #status beneath the controls reads exactly "Invite sent to ali@example.com". | /private/tmp/codex-probe/e2e/shots/03-after-submit.png |
| 3 | Every card's content stays inside its card; all text is readable. | fail | In both initial and final views, the project name extends outside its card and beyond the viewport. The Notes paragraph is nearly indistinguishable from its background. The other three cards' content fits. | /private/tmp/codex-probe/e2e/shots/03-after-submit.png |

## Findings

### [major] Project name overflows its card and the viewport

At 1440×900, .card.overflow .num visibly spills beyond the "Longest project name" card and is cut off at the screen edge. Its DOM text is "Supercalifragilisticexpialidocious Initiative". The text ends at x=1594 while the card ends at x=1185, creating 154px of page overflow.

Likely cause: .card.overflow has width: 180px, white-space: nowrap and overflow: visible. Its .num text is 32px and measures approximately 610px wide.

Screenshot: /private/tmp/codex-probe/e2e/shots/01-initial.png

### [major] Notes paragraph has almost no contrast

In both captured states, .card.lowcontrast p is barely visible beneath "Notes". Its text is "This paragraph is intentionally nearly invisible." Computed foreground #22252b against card background #171a21 yields approximately 1.13:1 contrast.

Likely cause: The paragraph's dark text color is too close to the card background, making the 16px body text unreadable.

Screenshot: /private/tmp/codex-probe/e2e/shots/03-after-submit.png

## Screenshots

- /private/tmp/codex-probe/e2e/shots/01-initial.png
- /private/tmp/codex-probe/e2e/shots/02-email-filled.png
- /private/tmp/codex-probe/e2e/shots/03-after-submit.png
