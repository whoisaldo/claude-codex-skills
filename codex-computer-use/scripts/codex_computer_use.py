#!/usr/bin/env python3
"""
codex_computer_use.py - hand a running web UI to GPT-6-Astra (through the
Codex CLI) so it can drive it in a real browser, look at screenshots, and
report what is actually there.

Auth: whatever `codex` is already logged in with (ChatGPT OAuth). No API key.

How it works:
  1. A headless Chrome session is started OUTSIDE Codex's sandbox with
     agent-browser (vendored into <skill>/vendor on first use) and pointed at
     the target URL. Chrome cannot launch inside the Seatbelt sandbox, but a
     sandboxed client can talk to a daemon that is already running, so the
     daemon's socket is placed in the run directory, which is the sandbox's
     writable workspace.
  2. codex exec (workspace-write, confined to the run dir) drives the page with
     that CLI, saves screenshots under ./shots, views each one, and answers in
     a fixed JSON shape (--output-schema).
  3. The browser is closed, report.json / report.md are written, and the
     verdict is printed and returned as the exit code:
       0 pass   1 fail   2 blocked   3 error (codex/browser/tooling)
Nothing in the project under test is written by Codex or by this script.
"""

import argparse
import json
import os
import re
import secrets
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_MODEL = "gpt-6-astra"
DEFAULT_EFFORT = "max"
EFFORTS = ["low", "medium", "high", "xhigh", "max", "ultra"]
AGENT_BROWSER_VERSION = "0.38.0"

SKILL_DIR = Path(__file__).resolve().parent.parent
VENDOR = SKILL_DIR / "vendor"                       # holds node_modules/agent-browser
SCHEMA = SKILL_DIR / "assets" / "report.schema.json"
RUN_ROOT = Path("/tmp/codex-computer-use")

EXIT = {"pass": 0, "fail": 1, "blocked": 2, "error": 3}


def log(msg):
    print(msg, file=sys.stderr, flush=True)


# ----------------------------------------------------------------------------
# prompt
# ----------------------------------------------------------------------------

PROMPT_FILE = SKILL_DIR / "assets" / "prompt.txt"   # the verifier prompt Astra receives
PROMPT = PROMPT_FILE.read_text()


def build_prompt(run_dir, ab, url, viewport, media, project, references, task):
    context = []
    if project:
        context.append(f"Project source (read-only, for intent): {project}")
    if references:
        context.append(
            f"{len(references)} reference image(s) are attached: they show the intended "
            "design. Compare the live page against them and report every deviation "
            "in layout, spacing, colour, type, and missing or extra elements.")
    return PROMPT.format(
        run_dir=run_dir, ab=ab, url=url, viewport=viewport,
        media_line=f" ({media} colour scheme)" if media else "",
        context_lines="\n".join(context) + ("\n" if context else ""),
        task=task.strip(),
    )


# ----------------------------------------------------------------------------
# agent-browser (runs outside the sandbox)
# ----------------------------------------------------------------------------

def ensure_agent_browser():
    """Return the vendored agent-browser binary, installing it on first use."""
    binary = VENDOR / "node_modules" / ".bin" / "agent-browser"
    if binary.exists():
        return binary
    if not shutil.which("npm"):
        raise RuntimeError("npm not found; install Node.js to provision agent-browser")
    log(f"  provisioning agent-browser@{AGENT_BROWSER_VERSION} into {VENDOR} (one-time)...")
    VENDOR.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["npm", "install", "--prefix", str(VENDOR), "--no-audit", "--no-fund",
                        f"agent-browser@{AGENT_BROWSER_VERSION}"],
                       capture_output=True, text=True)
    if r.returncode != 0 or not binary.exists():
        raise RuntimeError(f"npm install agent-browser failed: {r.stderr.strip()[-400:]}")
    return binary


def ab(binary, env, *cmd, timeout=90):
    r = subprocess.run([str(binary), *cmd], env=env, capture_output=True, text=True,
                       timeout=timeout)
    out = (r.stdout + r.stderr).strip()
    return r.returncode, out


def browser_env(run_dir, session):
    env = os.environ.copy()
    env["AGENT_BROWSER_SOCKET_DIR"] = str(run_dir / "browser")   # inside the sandbox workspace
    env["AGENT_BROWSER_SESSION"] = session
    return env


def open_browser(binary, env, run_dir, session, url, viewport, media):
    w, h = viewport
    (run_dir / "browser").mkdir(exist_ok=True)
    rc, out = ab(binary, env, "set", "viewport", str(w), str(h))
    if rc != 0:
        raise RuntimeError(f"agent-browser could not start Chrome: {out[-500:]}\n"
                           f"  Try: {binary} install")
    if media:
        ab(binary, env, "set", "media", media)
    rc, out = ab(binary, env, "open", url, timeout=120)
    if rc != 0:
        raise RuntimeError(f"agent-browser could not open {url}: {out[-500:]}")
    sock = run_dir / "browser" / f"{session}.sock"
    if not sock.exists():
        raise RuntimeError("agent-browser did not create its socket in the run dir; this "
                           "version may no longer honour AGENT_BROWSER_SOCKET_DIR, and the "
                           "sandboxed Codex client will not reach the browser")
    return out.splitlines()[-1] if out else ""


def close_browser(binary, env):
    try:
        ab(binary, env, "close", timeout=30)
    except Exception:
        pass


# ----------------------------------------------------------------------------
# codex
# ----------------------------------------------------------------------------

def run_codex(args, prompt, images, timeout, env, label):
    """Run `codex exec ...` with the prompt on stdin. Returns (thread_id, last_msg, rc)."""
    cmd = ["codex", "exec", *args]
    for img in images:
        cmd += ["-i", str(img)]
    # The prompt goes over stdin: `-i` is variadic and would swallow a
    # positional prompt, and stdin sidesteps argv limits on long briefs.

    thread_id, last_msg, err_lines = None, None, []
    err_file = tempfile.TemporaryFile(mode="w+")
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=err_file,
                                stdin=subprocess.PIPE, text=True, bufsize=1,
                                env=env, start_new_session=True)
    except FileNotFoundError:
        err_file.close()
        return None, "codex CLI not found on PATH", 127

    timed_out = threading.Event()

    def _kill():
        timed_out.set()
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass

    watchdog = threading.Timer(timeout, _kill)
    watchdog.daemon = True
    watchdog.start()
    finished = threading.Event()

    def _heartbeat():
        waited = 0
        while not finished.wait(15):
            waited += 15
            log(f"  ... {label} still running ({waited}s elapsed)")

    threading.Thread(target=_heartbeat, daemon=True).start()

    try:
        try:
            proc.stdin.write(prompt)
            proc.stdin.close()
        except (BrokenPipeError, ValueError):
            pass
        for line in proc.stdout:
            line = line.strip()
            if not line:
                continue
            try:
                evt = json.loads(line)
            except json.JSONDecodeError:
                continue
            etype = evt.get("type")
            if etype == "thread.started":
                thread_id = evt.get("thread_id")
                log(f"  codex thread {thread_id}")
            elif etype == "item.completed":
                item = evt.get("item", {})
                if item.get("type") == "agent_message":
                    last_msg = item.get("text")
                elif item.get("type") == "command_execution":
                    cmdline = (item.get("command") or "").replace("\n", " ")
                    cmdline = re.sub(r"^/bin/zsh -lc ", "", cmdline)
                    log(f"  $ {cmdline[:110]}")
            elif etype == "error":
                err_lines.append(json.dumps(evt)[:500])
        proc.wait()
    finally:
        finished.set()
        watchdog.cancel()

    if timed_out.is_set():
        err_file.close()
        return thread_id, f"timed out after {timeout}s", 124
    try:
        err_file.seek(0)
        stderr = err_file.read()
    except Exception:
        stderr = ""
    finally:
        err_file.close()
    if proc.returncode != 0 and stderr.strip():
        err_lines.append(stderr.strip()[-800:])
    return thread_id, (last_msg or "; ".join(err_lines) or None), proc.returncode


def codex_exec_args(run_dir, model, effort, session):
    return ["--json", "--skip-git-repo-check",
            "-s", "workspace-write", "-C", str(run_dir),
            "-m", model, "-c", f'model_reasoning_effort="{effort}"',
            "-c", 'approval_policy="never"',
            "-c", "sandbox_workspace_write.network_access=true",
            # Belt and braces: the vars are also inherited from our environment.
            "-c", f'shell_environment_policy.set.AGENT_BROWSER_SOCKET_DIR="{run_dir / "browser"}"',
            "-c", f'shell_environment_policy.set.AGENT_BROWSER_SESSION="{session}"',
            "--output-schema", str(SCHEMA),
            "-o", str(run_dir / "last_message.txt")]


def parse_report(text):
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{.*\}", text, re.S)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            return None
    return None


# ----------------------------------------------------------------------------
# output
# ----------------------------------------------------------------------------

def preflight_url(url):
    """Fail fast if nothing answers at the URL. Any HTTP response counts as alive."""
    try:
        urllib.request.urlopen(urllib.request.Request(url, method="GET"), timeout=8).read(1)
    except urllib.error.HTTPError:
        return
    except Exception as e:
        raise RuntimeError(
            f"nothing answered at {url} ({e}). Start the dev server first and pass "
            "its URL as --url (use 127.0.0.1, not 0.0.0.0)")


def severity_counts(report):
    counts = {}
    for f in report.get("findings", []):
        counts[f.get("severity", "?")] = counts.get(f.get("severity", "?"), 0) + 1
    return ", ".join(f"{n} {s}" for s, n in
                     sorted(counts.items(), key=lambda kv: ["blocker", "major", "minor", "nit", "?"].index(kv[0])))


def write_report_md(run_dir, report, meta):
    lines = ["# codex-computer-use report", "",
             f"- Target: {meta['url']}",
             f"- Viewport: {meta['viewport']}" + (f" ({meta['media']})" if meta['media'] else ""),
             f"- Model: {meta['model']} ({meta['effort']})",
             f"- Thread: {meta['thread_id'] or '-'}",
             f"- Elapsed: {meta['elapsed_s']}s",
             f"- Run dir: {run_dir}", "",
             f"## Verdict: {report['verdict'].upper()}", "", report.get("summary", ""), ""]
    checks = report.get("checks", [])
    if checks:
        lines += ["## Checks", "", "| # | Check | Status | Evidence | Screenshot |", "|---|---|---|---|---|"]
        for i, c in enumerate(checks, 1):
            lines.append(f"| {i} | {c.get('check','')} | {c.get('status','')} | "
                         f"{c.get('evidence','').replace('|', '/')} | {c.get('screenshot','')} |")
        lines.append("")
    findings = report.get("findings", [])
    lines += ["## Findings", ""]
    if not findings:
        lines.append("None.")
    for f in findings:
        lines += [f"### [{f.get('severity')}] {f.get('title')}", "", f.get("detail", ""), ""]
        if f.get("likely_cause"):
            lines += [f"Likely cause: {f['likely_cause']}", ""]
        if f.get("screenshot"):
            lines += [f"Screenshot: {f['screenshot']}", ""]
    console = report.get("console", [])
    if console:
        lines += ["## Console", ""] + [f"- {c}" for c in console] + [""]
    shots = report.get("screenshots", [])
    if shots:
        lines += ["## Screenshots", ""] + [f"- {s}" for s in shots] + [""]
    (run_dir / "report.md").write_text("\n".join(lines))


def print_summary(run_dir, report, meta):
    sev = severity_counts(report)
    log(f"[codex-computer-use] verdict: {report['verdict'].upper()}"
        f"{' (' + sev + ')' if sev else ''} in {meta['elapsed_s']}s")
    print(f"Verdict: {report['verdict']}")
    print(f"Summary: {report.get('summary', '')}")
    checks = report.get("checks", [])
    if checks:
        print("Checks:")
        for c in checks:
            mark = {"pass": "PASS", "fail": "FAIL", "blocked": "BLOCKED"}.get(c.get("status"), "?")
            print(f"  [{mark}] {c.get('check')} -- {c.get('evidence')}")
    findings = report.get("findings", [])
    print(f"Findings: {len(findings)}")
    for f in findings:
        print(f"  [{f.get('severity')}] {f.get('title')}")
        print(f"      {f.get('detail')}")
        if f.get("likely_cause"):
            print(f"      likely cause: {f['likely_cause']}")
        if f.get("screenshot"):
            print(f"      see: {resolve_shot(run_dir, f['screenshot'])}")
    if report.get("console"):
        print("Console:")
        for c in report["console"]:
            print(f"  {c}")
    print(f"Report: {run_dir / 'report.md'}")
    shots = sorted((run_dir / "shots").glob("*.png"))
    if shots:
        print("Screenshots:")
        for s in shots:
            print(f"  {s}")


def resolve_shot(run_dir, path):
    p = Path(path)
    return str(p if p.is_absolute() else run_dir / p)


def fail(args, msg, code=EXIT["error"]):
    log(f"[codex-computer-use] ERROR: {msg}")
    if args.json:
        print(json.dumps({"ok": False, "error": msg}, indent=2))
    sys.exit(code)


# ----------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(
        description="Have GPT-6-Astra drive a running web UI in headless Chrome and report "
                    "what it sees. Exit code: 0 pass, 1 fail, 2 blocked, 3 error.")
    ap.add_argument("--url", required=True, help="Page to verify (use 127.0.0.1, not 0.0.0.0).")
    ap.add_argument("--task", help="The brief: what changed, what to check, pass criteria.")
    ap.add_argument("--task-file", help="File containing the brief.")
    ap.add_argument("--out", help="Run directory for screenshots and reports "
                                  "(default /tmp/codex-computer-use/<run-id>).")
    ap.add_argument("--viewport", default="1440x900", help="WxH (default 1440x900).")
    ap.add_argument("--media", choices=["dark", "light"], help="Emulate prefers-color-scheme.")
    ap.add_argument("--reference", action="append", default=[],
                    help="Design reference image to compare against. Repeatable.")
    ap.add_argument("--project", help="Project root Astra may READ for intent (never written).")
    ap.add_argument("--model", default=DEFAULT_MODEL, help=f"Codex model (default {DEFAULT_MODEL}).")
    ap.add_argument("--effort", default=DEFAULT_EFFORT, choices=EFFORTS,
                    help=f"Reasoning effort (default {DEFAULT_EFFORT}). high for quick re-checks.")
    ap.add_argument("--timeout", type=int, default=1500, help="Seconds for the Codex run (default 1500).")
    ap.add_argument("--json", action="store_true", help="Emit JSON result on stdout.")
    args = ap.parse_args()

    if not args.task and not args.task_file:
        ap.error("one of --task or --task-file is required")
    task = args.task or Path(args.task_file).expanduser().read_text()
    m = re.fullmatch(r"(\d{3,4})x(\d{3,4})", args.viewport)
    if not m:
        ap.error("--viewport must look like 1440x900")
    viewport = (int(m.group(1)), int(m.group(2)))
    references = [Path(r).expanduser().resolve() for r in args.reference]
    for r in references:
        if not r.exists():
            ap.error(f"--reference file not found: {r}")
    project = Path(args.project).expanduser().resolve() if args.project else None
    if project and not project.is_dir():
        ap.error(f"--project is not a directory: {project}")
    if not SCHEMA.exists():
        fail(args, f"schema missing: {SCHEMA}")

    url = args.url.replace("://0.0.0.0", "://127.0.0.1")
    run_id = time.strftime("%Y%m%d-%H%M%S") + "-" + secrets.token_hex(2)
    run_dir = Path(args.out).expanduser().resolve() if args.out else RUN_ROOT / run_id
    (run_dir / "shots").mkdir(parents=True, exist_ok=True)
    session = f"verify-{run_id}"

    try:
        preflight_url(url)
        binary = ensure_agent_browser()
    except Exception as e:
        fail(args, str(e))
    if not shutil.which("codex"):
        fail(args, "codex CLI not found on PATH")

    env = browser_env(run_dir, session)
    log(f"[codex-computer-use] {url} @ {viewport[0]}x{viewport[1]}"
        f"{' ' + args.media if args.media else ''} -> {run_dir}")
    t0 = time.time()
    try:
        title = open_browser(binary, env, run_dir, session, url, viewport, args.media)
    except Exception as e:
        fail(args, str(e))
    log(f"  browser open: {title}")

    prompt = build_prompt(run_dir, binary, url, f"{viewport[0]}x{viewport[1]}", args.media,
                          project, references, task)
    (run_dir / "prompt.txt").write_text(prompt)
    log(f"  {args.model} ({args.effort}) is verifying; budget 3-10 min at max effort")
    try:
        thread_id, last_msg, rc = run_codex(
            codex_exec_args(run_dir, args.model, args.effort, session),
            prompt, references, args.timeout, env, "astra")
    finally:
        close_browser(binary, env)
    elapsed = round(time.time() - t0, 1)

    if rc == 124:
        fail(args, f"codex timed out after {args.timeout}s; raise --timeout or narrow the brief")
    if thread_id is None:
        fail(args, f"codex did not start a thread (rc={rc}): {last_msg}")
    report = parse_report(last_msg)
    if not report or "verdict" not in report:
        hint = ""
        if last_msg and re.search(r"log ?in|auth|credential|401|unauthor", last_msg, re.I):
            hint = " -- run `codex login` and retry."
        fail(args, f"codex finished without a report (rc={rc}). Last message: "
                   f"{(last_msg or 'none')[:400]}{hint}")

    meta = {"url": url, "viewport": f"{viewport[0]}x{viewport[1]}", "media": args.media,
            "model": args.model, "effort": args.effort, "thread_id": thread_id,
            "elapsed_s": elapsed, "run_dir": str(run_dir)}
    payload = {"ok": True, "verdict": report["verdict"], **meta, "report": report,
               "screenshots": [str(p) for p in sorted((run_dir / "shots").glob("*.png"))]}
    (run_dir / "report.json").write_text(json.dumps(payload, indent=2))
    write_report_md(run_dir, report, meta)

    if args.json:
        print(json.dumps(payload, indent=2))
        log(f"[codex-computer-use] verdict: {report['verdict'].upper()} in {elapsed}s -> {run_dir}")
    else:
        print_summary(run_dir, report, meta)
    return EXIT.get(report["verdict"], EXIT["error"])


if __name__ == "__main__":
    sys.exit(main())
