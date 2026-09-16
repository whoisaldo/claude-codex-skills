# claude-codex-skills

Three [Agent Skills](https://agentskills.io) that let Claude Code hand the
jobs it is bad at to OpenAI Codex (GPT-6-Astra), then check the result before
using it.

| You need | Skill | What Codex does |
|---|---|---|
| A picture: hero, illustration, mockup, texture, og:image | [`codex-image`](codex-image/) | Runs its built-in `image_gen` tool. The wrapper harvests the PNG. |
| An object: a three.js module or an animatable SVG | [`codex-3d`](codex-3d/) | Models the geometry in a sandboxed folder. The wrapper renders it headlessly and lets Astra fix its own render. |
| To know whether a running page is right | [`codex-computer-use`](codex-computer-use/) | Drives the page in headless Chrome, screenshots every state, and reports pass/fail with evidence. |

Claude writes the code. Codex draws, models, or inspects. Claude looks at
what came back and wires it in. The three skills are disjoint on purpose.
Each `SKILL.md` description says when to use it and when not to, so Claude
picks the right one without being told.

## Why

Claude cannot draw, and it cannot model. A hand-written SVG "hero" looks
like clip art, and a hand-written three.js car is boxes on cylinders. Claude
is also not great at noticing what is wrong with a page once it is running.
Codex has an image generator built in. GPT-6-Astra builds convincing
geometry. At max reasoning it is a stubborn, precise inspector that measures
things instead of eyeballing them. Each skill here is a small Python wrapper
around `codex exec` that gives Claude that capability from the terminal.

## What you need

- [Claude Code](https://claude.com/claude-code), or any agent that reads
  `SKILL.md` files. The scripts are plain command-line tools and run without
  an agent too.
- [Codex CLI](https://github.com/openai/codex) on `PATH`, logged in with
  `codex login` using a ChatGPT account. No `OPENAI_API_KEY`. Usage goes
  through your ChatGPT plan's Codex limits.
- Python 3. The scripts use only the standard library.
- Node.js and npm, for `codex-3d` (the three.js contract check) and
  `codex-computer-use` (agent-browser). Both install into the skill's
  `vendor/` folder on first use.
- Google Chrome or Chromium, for `codex-3d` renders and for
  `codex-computer-use`.

Developed and tested on macOS. Linux should work; the one macOS-only piece
is `--exact-size` in `codex-image`, which uses `sips` and is skipped
elsewhere. Windows is untested beyond the copy installer.

## Install

```bash
git clone https://github.com/whoisaldo/claude-codex-skills.git
cd claude-codex-skills
./install.sh
```

`install.sh` symlinks each skill into `~/.claude/skills/`. Because they are
symlinks, `git pull` updates them in place. Restart Claude Code to pick them
up.

To target another skills directory, for a different agent or a
project-local `.claude/skills`:

```bash
SKILLS_DIR=/path/to/skills ./install.sh
```

Windows (PowerShell) copies instead of linking, so re-run it after every
pull:

```powershell
git clone https://github.com/whoisaldo/claude-codex-skills.git
& .\claude-codex-skills\install.ps1
```

One skill only: symlink its folder into `~/.claude/skills/<name>`.

## Try it

In Claude Code you do not call these by hand. Ask for a hero image, a 3D
object, or "check that the signup page works" and the matching skill loads.
From a shell, each script prints progress to stderr and result paths to
stdout:

```bash
# A picture, about a minute
python3 ~/.claude/skills/codex-image/scripts/codex_image.py \
  --out public/images/hero.png \
  --prompt "Use case: ads-marketing
Primary request: abstract glass ribbons sweeping across a dark field
Composition/framing: subject on the right; left third empty for headline copy
Constraints: no text, no logos, no watermark"

# An object, about nine minutes
python3 ~/.claude/skills/codex-3d/scripts/codex_3d.py --out public/3d/car \
  --prompt "Object: one low, wide retro-futuristic muscle car
Size: 4.6 m long, wheelbase 2.75 m
Parts to expose: wheel_fl, wheel_fr, wheel_rl, wheel_rr, steer_fl, steer_fr
Constraints: no text, no logos, tyres touch y = 0"

# A check of a running page, three to ten minutes
python3 ~/.claude/skills/codex-computer-use/scripts/codex_computer_use.py \
  --url http://127.0.0.1:3000/signup \
  --task "Checks: 1. Empty submit shows 'Enter your email' in red. 2. Nothing clips at this width."
```

Each skill's README shows real output: generated images and a demo page
built from them, a car built by Astra with its contact sheet, and a
build-verify-fix loop where Astra caught a CSS bug Claude's first fix missed.

## How it works

Every skill runs `codex exec --json` with the prompt on stdin and reads the
event stream back. What Codex may touch is kept narrow:

- `codex-image` runs Codex read-only. Generated images land in
  `$CODEX_HOME/generated_images/<thread id>/`, and the wrapper copies only
  the ones from its own thread to `--out`, so parallel runs never mix.
- `codex-3d` runs Codex with write access to the build folder only. It
  renders `viewer.html` with headless Chrome, and the viewer posts measured
  bounds, triangle count and part names (or the JavaScript error) back to a
  throwaway local server. The same Codex thread is then resumed with the
  renders attached so Astra can fix what it sees.
- `codex-computer-use` starts headless Chrome outside Codex's sandbox with
  [agent-browser](https://github.com/vercel-labs/agent-browser), places the
  browser socket inside the run directory, and runs Codex with write access
  to that directory only. Astra drives the page from the shell, saves
  screenshots, views each one, and answers in a fixed JSON schema. The
  verdict is the exit code. The project under test is never written to.

Nothing here talks to OpenAI except the Codex CLI itself. That also means
every prompt, every `--input` or `--reference` image, and every screenshot
Astra takes goes to OpenAI through Codex. Do not point these at pages or
images you would not paste into ChatGPT.

The per-skill READMEs cover flags, the exact prompt Codex receives, and
failure modes. The `references/` folder in each skill holds the prompting
recipes Claude loads when a first attempt misses.

## Layout

```
<skill>/
  SKILL.md        what the agent reads: when to trigger, how to write the spec, workflow
  README.md       for people: what it does, install, flags, example output
  scripts/        the wrapper (Python, standard library only)
  references/     prompting recipes the agent loads on demand
  assets/         prompts, schemas and viewers the script uses
  examples/       real output from real runs
  vendor/         npm dependencies, created on first use, gitignored
```

## License

MIT. See [LICENSE](LICENSE).
