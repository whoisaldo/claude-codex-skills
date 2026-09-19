# codex-3d notes

Build dir: `examples/car-blender`  
Format: blender  
Model: gpt-6-astra (high)  
Thread: 01a0b6ad-71e9-7513-a800-af5a70757618

## Specification

```
Object: one low, wide, angular retro-futuristic muscle sports car
Use: hero object for a dark website intro. The page will animate it drifting across the screen with spinning, steering wheels, so the wheels must be separate parts.
Style: sleek stylised realism (not a toy, not a box car): long hood, cab-rearward, short rear deck, wide rear haunches, a slim full-width LED headlight strip, full-width tail light bar, subtle ducktail spoiler, side mirrors, low-profile tyres on dark 5-spoke alloys, brake discs visible behind the spokes
Materials: body high-gloss yellow #F5C518 clearcoat paint; dark tinted glass; matte black lower trim, splitter and diffuser; brushed dark-chrome accents; headlight strip emissive cool white; tail bar emissive red
Size: about 4.6 m long, 1.95 m wide, 1.25 m tall, wheelbase about 2.75 m
Parts to expose: wheel_fl, wheel_fr, wheel_rl, wheel_rr (each spins about its own axle); steer_fl, steer_fr (pivot groups that contain the front wheels, for steering); body; headlights; taillight; spoiler
Idle animation: none, the page drives it
Constraints: no text, no logos, symmetric left/right, all four tyres touch the ground plane exactly, under 150k triangles
```

## Build

Built the yellow retro-futuristic muscle car.

Files: [object.blend](object.blend) · [object.glb](object.glb)

- Exposed parts: `body`, `headlights`, `taillight`, `spoiler`, `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`, `steer_fl`, `steer_fr`.
- In three.js, spin wheels with `.rotation.x`, steer front pivots with `.rotation.y`, and move root `yellow_interceptor`.
- No animation clips. All tyres touch ground exactly.
- Validation passed: 54,260 triangles; approximately 4.60 m long and 1.26 m tall.

Compromises: opaque tinted glazing without an interior; mirrors extend overall width to 2.07 m.

## Review pass 1

Reduced washed-out paint and glass reflections, corrected uneven body shading, added dark wheel-well liners and slim arch trim, and lowered the ducktail.

Re-saved `object.blend` and re-exported `object.glb`. Validation prints **OK**: 58,100 mesh triangles, all tyres grounded, steering pivots preserved.

# codex-3d notes

Build dir: `examples/car-blender`  
Format: blender  
Model: gpt-6-astra (high)  
Thread: 01a0b6ba-091c-7fa1-801a-e2a1f7e3eacf

## Revision: The side and rear glass reads light grey in the side and top views because it mirrors the bright environment. Make all g

Updated all glazing to near-black blue-grey with zero metallic, 0.55 roughness, and reduced reflections. Everything else remains unchanged.

Saved `object.blend`, re-exported `object.glb`, and ran the checker: **OK**.

## Review pass 1

Reduced the remaining windshield reflections and raised glazing roughness to 0.60. Geometry, proportions, and part names remain unchanged.

Re-saved `object.blend`, re-exported `object.glb`, and ran `node check.mjs object.glb`: **OK**.

