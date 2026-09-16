# Example: build, verify, fix, verify again

Three real runs of the wrapper, all at `--effort max`, with Claude fixing the
page between them. The page is `probe-page/index.html`, a small dark dashboard
built with two planted defects (a card whose text overflows, a paragraph with
almost no contrast) and an invite form that has to work.

| Run | Page | Verdict | Findings | Time | Folder |
|---|---|---|---|---|---|
| 1 | as built | FAIL | 2 major: overflow, contrast | 168 s | `run1-as-built/` |
| 2 | after Claude's first fix | FAIL | 1 major: grid track expanded instead of truncating; 1 minor: placeholder contrast | 199 s | `run2-first-fix/` |
| 3 | after applying Astra's suggested fix | PASS | none | 172 s | `run3-fixed/` |

`fix.diff` is the complete change from `probe-page/` to `fixed-page/`.

## Reproduce run 1

```bash
python3 -m http.server 8791 --bind 0.0.0.0 -d examples/probe-page &
python3 scripts/codex_computer_use.py --url http://127.0.0.1:8791/ --task "$(cat <<'BRIEF'
What changed: first pass of an internal metrics dashboard (dark theme) with an invite form.
Checks:
  1. Header shows 'Probe Dashboard' and three nav links: Overview, Reports, Settings.
  2. Fill the email field with ali@example.com and click 'Send invite'; the status line beneath the form must read exactly 'Invite sent to ali@example.com'.
  3. Every card's content stays inside its card at this viewport; all text is readable.
Pass criteria: 1-3 hold and there are no console errors.
Ignore: the nav links are placeholders (href='#').
BRIEF
)"
```

Serve `examples/fixed-page` instead to reproduce run 3. Runs 2 and 3 used the
same checks with a "What changed:" line describing the fix and, for check 3,
the explicit expectation that the name is clipped with an ellipsis.

## Files

| File | What it is |
|---|---|
| `run*/01-initial.png` | First screenshot Astra took, before touching anything |
| `run*/03-after-submit.png` | After filling the email and clicking Send invite |
| `run*/report.md` | The report the wrapper wrote |
| `run*/report.json` | The same, machine-readable, as `--json` prints it |
| `run1-as-built/prompt-sent.txt` | The exact prompt Astra received for run 1 (template + brief) |
| `probe-page/index.html` | The page as built, with the planted defects |
| `fixed-page/index.html` | The page after both fixes |
| `fix.diff` | The whole change between them |
