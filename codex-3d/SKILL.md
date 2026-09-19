---
name: codex-3d
description: Build real 3D objects, and code-drawn 2D vector objects, by handing the modelling to GPT-6-Astra through the Codex CLI, which models geometry far better than Claude can by hand. Output is a drop-in three.js module, a GLB plus .blend that Astra models in a real Blender through Blender MCP, or SVG, plus headless renders checked against the spec. Use when the deliverable is an OBJECT that must exist as geometry or vector code - an interactive or animated 3D thing on a page (spinning product, drifting car intro, 3D logo, configurator, hero object), a three.js/WebGL asset, a GLB/glTF or Blender model, a procedural model, or a 2D vector object that must be animated part by part, themed, or scaled without blur. Do NOT use when a picture is enough - a static hero, illustration, texture, mockup, or "3D-render-style" background is a raster job for codex-image, not this. Do NOT use for UI code, layout, charts, icon sets, or screenshots of a running app.
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
| A GLB/glTF or `.blend` model, for a page, a game engine, or someone who will keep editing it in Blender | **codex-3d** (`--format blender`) |
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
| `object.glb` + `object.blend` | The deliverable with `--format blender`: binary glTF whose named nodes are the parts, plus the Blender source it was exported from |
| `preview.png` | Three-quarter hero render. **View it.** |
| `sheet.png` | 2x2 contact sheet (three-quarter, front, side, top). **View it too** - a single angle hides broken sides |
| `viewer.html` | Standalone orbit viewer for the object (three.js from a CDN importmap) |
| `notes.md` | Spec plus Astra's build and review reports: part names, animation hooks, compromises |
| `check.mjs` | Contract checker Astra ran (`node check.mjs`); re-run it after hand edits |

Key flags:

| Flag | Purpose |
|---|---|
| `--format three` (default) / `svg` / `blender` | 3D three.js module, 2D vector object, or a GLB modelled in Blender (see "Modelling in Blender") |
| `--passes N` | `2` (default): build, render, then Astra reviews its own render and fixes what it sees. `1` skips the review. `3` adds a round for intricate objects |
| `--revise "change"` | Change the existing object in `--out` instead of rebuilding. Attaches current renders so Astra sees what it is fixing |
| `--render-only` | Re-render after editing `object.js` by hand |
| `--input FILE` | Reference image (repeatable): a photo of the real thing, a site screenshot for palette |
| `--effort` | `high` (default). `xhigh` for intricate mechanisms; `medium` for simple props |
| `--size WxH`, `--bg HEX` | Render size (default 1536x1024) and background |
| `--blender PATH` | Blender binary for `--format blender`, if it is not in the usual place |
| `--json` | Machine-readable result including measured bounds, triangle count, part names |
| `--timeout` | Seconds per Codex pass (default 1500) |

**Budget about 6 minutes for an SVG and 9 minutes for a detailed 3D object
at `--passes 2`, `--effort high`** (measured on the example car: Astra writes
and checks a few hundred lines of geometry per pass; rendering takes
seconds). The same car took 12 minutes with `--format blender`. Run it in a
background Bash call and keep working; the log prints a heartbeat every 15 s.
Independent objects can run in parallel - each run is its own Codex thread
and its own build folder.

## Modelling in Blender (`--format blender`)

Astra models in a real Blender through the Blender MCP server instead of
writing three.js geometry code, then exports `object.glb`. The spec, the
renders and the review loop stay the same. The viewer loads the exported GLB
in three.js, so what you check is what the page will show, not Blender's
viewport.

Pick it when:

- the user asks for Blender, a `.blend`, or a GLB/glTF asset;
- the object is going somewhere other than a three.js page (a game engine,
  AR, a designer who will keep editing it);
- the form needs real modelling tools (subdivision surfaces, bevels,
  booleans, curves) and a `three` build came out faceted or boxy.

Stay with `three`, the default, when the page only needs a drop-in module.
That is a ~20 KB text file with a synchronous `createObject()`, recolourable
in code, with no binary to host and no Blender needed on the machine. The
example car came out as a 1.4 MB GLB from Blender and took 12 minutes
instead of 9.

The script starts its **own throwaway Blender** on a free port for the run,
makes it the only MCP server Codex can see, and kills it afterwards. It never
connects to a Blender the user already has open on the default port 9876,
so unsaved work there is safe and Blender builds can run in parallel.
Do not "help" by building the object yourself with the `mcp__blender__*`
tools. Those drive the user's open session, and you still cannot model.

Astra's Python runs inside Blender, which is outside the Codex sandbox. For
these runs the MCP server's safe mode is on (only `bpy`, `bmesh`, `mathutils`
and pure stdlib import; no `os`, `subprocess` or `open()`) and the
asset-library tools (Sketchfab, Poly Haven, Hyper3D) are off, so the object
is Astra's own geometry with no third-party licence attached.

Needs Blender, the Blender MCP add-on enabled in it, `mcp-for-blender` on
`PATH` (or its command in `CODEX_3D_BLENDER_MCP`), and a logged-in graphical
session, because the add-on cannot serve from `blender -b`. `--revise`
reopens `object.blend`; `--render-only` needs no Blender.

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

For `--format blender`, write the same spec but say "the ground" rather than
`y = 0` (Blender is Z-up; the export converts), keep part names to lowercase
letters, digits and underscores, and describe an idle animation as motion of
named parts with a loop length. Astra keyframes it and the GLB carries it as
glTF clips, not `updateObject`.

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

`object.glb` (`--format blender`) loads through `GLTFLoader`; parts are found
by name and turn about the origins Astra gave them. Copy the file somewhere
the page can fetch it, such as `public/3d/car/`:

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltf = await new GLTFLoader().loadAsync('/3d/car/object.glb');
const car = gltf.scene;              // rests on y = 0, faces +Z
scene.add(car);
const wheel_fl = car.getObjectByName('wheel_fl');
// idle animation, if the spec asked for one:
const mixer = new THREE.AnimationMixer(car);
gltf.animations.forEach(clip => mixer.clipAction(clip).play());   // then mixer.update(dt) per frame
```

React Three Fiber: `const { scene, animations } = useGLTF('/3d/car/object.glb')`
and `<primitive object={scene} />`. Keep `object.blend` out of `public/`
unless it should ship; it is the editable source, not something the page loads.

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
- **`Blender exited during startup` / `did not open its MCP port`** (`--format blender`) - the Blender MCP add-on is not installed or enabled (`mcp-for-blender install-addon`, then enable "Blender MCP" in Preferences), or there is no logged-in graphical session. Pass `--blender PATH` if Blender is not in the usual place.
- **`Blender MCP server not found`** - put `mcp-for-blender` on `PATH` or set `CODEX_3D_BLENDER_MCP`. Do not point it at `blender-mcp` if that name is a launcher pinned to an always-on Blender; this needs the server itself, which honours `--port`.
- **Astra replies `WRONG BLENDER`** - the MCP server reached a Blender other than the throwaway one and Astra stopped before changing anything. Fix `CODEX_3D_BLENDER_MCP` so the command honours `--port`.
- **Looked right in Blender, wrong in the render** - only plain Principled BSDF values survive the glTF export. `--revise "replace the procedural shader on <part> with plain Principled values"`.
