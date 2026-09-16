---
name: codex-3d
description: Build real 3D objects, and code-drawn 2D vector objects, by handing the modelling to GPT-6-Astra through the Codex CLI, which models geometry far better than Claude can by hand. Output is a drop-in three.js module (or SVG) plus headless renders checked against the spec. Use when the deliverable is an OBJECT that must exist as geometry or vector code - an interactive or animated 3D thing on a page (spinning product, drifting car intro, 3D logo, configurator, hero object), a three.js/WebGL asset, a procedural model, or a 2D vector object that must be animated part by part, themed, or scaled without blur. Do NOT use when a picture is enough - a static hero, illustration, texture, mockup, or "3D-render-style" background is a raster job for codex-image, not this. Do NOT use for UI code, layout, charts, icon sets, or screenshots of a running app.
---

# Codex 3D Object Generation

Claude cannot model. A hand-written three.js "car" comes out as boxes on
cylinders, and a hand-drawn SVG object looks like clip art. GPT-6-Astra, run
through the Codex CLI, builds convincing geometry. This skill hands the
modelling job to Astra inside a sandboxed build folder, renders the result
headlessly so you can *see* it, lets Astra review its own render and fix
defects, and gives you back a module you wire into the project.

Auth is the user's existing `codex login` (a ChatGPT account) - **no API
key**; usage goes through their ChatGPT plan's Codex limits.

## Object or picture? Decide this first

This skill and `codex-image` are deliberately disjoint. The question is what
the deliverable *is*, not what it looks like.

| The deliverable is... | Skill |
|---|---|
| A 3D object the page rotates, animates, lights in real time, or lets the user orbit (product spinner, drifting car intro, 3D logo, configurator, WebGL hero) | **codex-3d** |
| A 3D asset for a scene or engine (three.js / React Three Fiber component, procedural model) | **codex-3d** |
| A 2D vector object that must be animated part by part (wheels spin, door opens), recoloured from CSS, or scaled without blur | **codex-3d** (`--format svg`) |
| A static picture: hero art, illustration, texture, product mockup, og:image, empty-state art, even one that *looks* like a 3D render | `codex-image` |
| A flat picture of an object that nobody will rotate or animate | `codex-image` |
| UI, layout, components, CSS | write code |
| A chart of real data | a chart library, written by hand |
| Simple shapes, arrows, dividers, an icon matching an existing set | inline SVG by hand |

> Rule of thumb: if the result will be **looked at**, generate an image. If it
> will be **turned, moved, animated, lit, or placed in a scene**, build an
> object with this skill.

**Never** build an object when the user asked for a picture, and never
generate a picture when they asked for something interactive. If a request
is ambiguous ("put a car on the landing page"), ask whether it should move or
be orbitable; if not, `codex-image` is cheaper and better.

## Usage

```bash
python3 ~/.claude/skills/codex-3d/scripts/codex_3d.py \
  --prompt "<spec>" --out path/to/build-dir
```

`--out` is a build folder (created). Codex is sandboxed to it and cannot
touch anything else in the project. You get:

| File | What it is |
|---|---|
| `object.js` | The deliverable: ES module, `createObject()` returns a `THREE.Group`; optional `updateObject(group, t, dt)`; `meta` |
| `object.svg` | The deliverable with `--format svg`: standalone SVG with `<g id="...">` parts on their pivots |
| `preview.png` | Three-quarter hero render. **View it.** |
| `sheet.png` | 2x2 contact sheet (three-quarter, front, side, top). **View it too** - a single angle hides broken sides |
| `viewer.html` | Standalone orbit viewer for the object (three.js from a CDN importmap) |
| `notes.md` | Spec plus Astra's build and review reports: part names, animation hooks, compromises |
| `check.mjs` | Contract checker Astra ran (`node check.mjs`); re-run it after hand edits |

Key flags:

| Flag | Purpose |
|---|---|
| `--format three` (default) / `svg` | 3D three.js module, or 2D vector object |
| `--passes N` | `2` (default): build, render, then Astra reviews its own render and fixes what it sees. `1` skips the review. `3` adds a round for intricate objects |
| `--revise "change"` | Change the existing object in `--out` instead of rebuilding. Attaches current renders so Astra sees what it is fixing |
| `--render-only` | Re-render after editing `object.js` by hand |
| `--input FILE` | Reference image (repeatable): a photo of the real thing, a site screenshot for palette |
| `--effort` | `high` (default). `xhigh` for intricate mechanisms; `medium` for simple props |
| `--size WxH`, `--bg HEX` | Render size (default 1536x1024) and background |
| `--json` | Machine-readable result including measured bounds, triangle count, part names |
| `--timeout` | Seconds per Codex pass (default 1500) |

**Budget about 6 minutes for an SVG and 9 minutes for a detailed 3D object
at `--passes 2`, `--effort high`** (measured on the example car: Astra writes
and checks a few hundred lines of geometry per pass; rendering takes
seconds). Run it in a background Bash call and keep working; the log prints
a heartbeat every 15 s.
Independent objects can run in parallel - each run is its own Codex thread
and its own build folder.

## Writing the spec

Astra builds what you describe, so describe the object like a modeller, not
like an art director. Include only lines that matter:

```
Object: <one thing, one sentence>
Use: <where it lives and how the page will move it - this decides which parts must be separate>
Style: <stylised realism | low-poly | technical | toy-like> + the defining shapes (long hood, short deck...)
Materials: <per surface: gloss paint #hex clearcoat, tinted glass, matte rubber, brushed metal, emissive lights>
Size: <real-world metres; wheelbase / key dimensions>
Parts to expose: <names for everything the page animates: wheel_fl, door_l, blade, lid...>
Idle animation: <none | what updateObject should do>
Constraints: no text, no logos, symmetric, under N triangles
```

For `--format svg`, replace Size with a viewBox, use kebab-case part ids, and
name the medium (flat, outlined, isometric, technical drawing).

Rules that materially change the result:

- **Name the parts you will animate.** Astra builds separate meshes with
  pivots for named parts; unnamed detail gets merged.
- **State real dimensions.** Bounds are measured and checked; wrong scale is
  the most common miss when you leave it out.
- **Describe materials per surface** with hex values from the project palette.
- **Say what it is for.** "Will be orbited by the user" gets a finished
  underside; "seen only from the front" lets Astra spend triangles wisely.

See `references/prompting.md` for recipes and failure-mode fixes.

## Workflow

1. **Confirm it is an object task** (table above). If a picture would do,
   stop and use `codex-image`.
2. Pick `--format`, the build folder (e.g. `public/3d/car`), and write the
   spec with named parts.
3. Run in the background. Read the log if it goes quiet for more than 15 s.
4. **View `preview.png` and `sheet.png` with the Read tool.** Check
   silhouette, proportions, parts touching the ground, nothing floating or
   intersecting, materials reading correctly. Check the `size` line in the
   status bar against the spec. Never ship an object you have not looked at.
5. If it misses, run `--revise "<one change>"`. Change one thing per round.
6. Wire it into the project (below) and re-render nothing - the module is
   the artifact; the PNGs were for you.
7. Serve the viewer so the user can orbit it: `python3 -m http.server 8765
   -d <build-dir>` and give them `http://localhost:8765/viewer.html`. If they
   are on another machine, bind to `0.0.0.0` and report the host's address
   instead.
8. Report the module path, the part names from `notes.md`, and the viewer URL.

## Wiring the object in

`object.js` imports the bare specifier `three`, so it drops into any bundled
project that has `three` installed (`npm i three@0.186.0`), and into a plain
page through an importmap (copy the one from `viewer.html`).

```js
import * as THREE from 'three';
import { createObject } from './3d/car/object.js';

const car = createObject();          // THREE.Group, rests on y = 0, faces +Z
scene.add(car);
const { wheel_fl, wheel_fr, wheel_rl, wheel_rr, steer_fl, steer_fr } = car.userData.parts;

function tick(t, dt) {
  for (const w of [wheel_fl, wheel_fr, wheel_rl, wheel_rr]) w.rotation.x -= dt * 12;
  steer_fl.rotation.y = steer_fr.rotation.y = Math.sin(t) * 0.3;
  car.position.x = -6 + (t % 6);
}
```

React Three Fiber: build once with `useMemo(() => createObject(), [])` and
render `<primitive object={car} />`; animate parts in `useFrame`.

Lighting is the consumer's job. The viewer uses an environment map
(`RoomEnvironment`), a shadowed key light and a rim light; copy that setup
if the page has no lighting yet, or the materials will look flat.

SVG: inline the file (so ids are reachable) and animate the groups:

```css
#wheel-front, #wheel-rear { animation: spin 0.6s linear infinite; transform-box: fill-box; transform-origin: center; }
@keyframes spin { to { transform: rotate(360deg); } }
```

## Failure handling

- **`render error: ... object.js failed`** - the module threw in the
  browser. The review pass usually fixes it; if it survives, `--revise` with
  the error text, or open `object.js` and fix the line yourself, then
  `--render-only`.
- **Looks like boxes glued together** - the spec was too vague. Add the
  defining shapes and "stylised realism, continuous surfaces", then
  `--revise` or rebuild with `--effort xhigh`.
- **Wrong scale** - state metres in the spec; `--revise "scale to 4.6 m long"`.
- **Parts not exposed** - `--revise "expose <name> as a separate pivot group in userData.parts"`.
- **Codex timed out** - raise `--timeout`; xhigh passes on complex objects can run long.
- **Auth errors** - tell the user to run `codex login`. Never ask for an API key.
- **No Chrome found** - pass `--chrome PATH` (Google Chrome, Chromium or Canary). Chrome only renders; Codex does not need it.
