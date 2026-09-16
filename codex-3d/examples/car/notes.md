# codex-3d notes

Build dir: `examples/car`  
Format: three  
Model: gpt-6-astra (high)  
Thread: 01a0ab7f-3333-7282-91d9-ffd8ccad4845

## Specification

```
Object: one low, wide, angular retro-futuristic muscle sports car
Use: hero object for a dark website intro. The page will animate it drifting across the screen with spinning, steering wheels, so the wheels must be separate parts.
Style: sleek stylised realism (not a toy, not a box car): long hood, cab-rearward, short rear deck, wide rear haunches, a slim full-width LED headlight strip, full-width tail light bar, subtle ducktail spoiler, side mirrors, low-profile tyres on dark 5-spoke alloys, brake discs visible behind the spokes
Materials: body high-gloss yellow #F5C518 clearcoat paint; dark tinted glass; matte black lower trim, splitter and diffuser; brushed dark-chrome accents; headlight strip emissive cool white; tail bar emissive red
Size: about 4.6 m long, 1.95 m wide, 1.25 m tall, wheelbase about 2.75 m
Parts to expose: wheel_fl, wheel_fr, wheel_rl, wheel_rr (each spins about its own axle); steer_fl, steer_fr (pivot groups that contain the front wheels, for steering); body; headlights; taillight; spoiler
Idle animation: none, the page drives it; updateObject may be omitted
Constraints: no text, no logos, symmetric left/right, all four tyres touch y = 0 exactly, under 150k triangles
```

## Build

Created [object.js](object.js): glossy yellow muscle car with tinted glass, LED bars, ducktail, five-spoke wheels, and visible brakes.

Exposed parts: `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`, `steer_fl`, `steer_fr`, `body`, `headlights`, `taillight`, `spoiler`.

Animate through `group.userData.parts`: wheel `rotation.x` controls spin; steering `rotation.y` controls turning. No idle animation.

Compromises: opaque tinted glass, simplified interior; mirrors extend total width to 2.09 m.

`node check.mjs`: **OK**, 81,552 triangles. All four tyres touch ground.

## Review pass 1

Updated `object.js` to smooth hood reflections, repair broken door seams and roof/window joins, reshape the rear pillars, and lower the ducktail. Reduced paint glare and removed protruding bumper blocks.

Wheel controls remain intact. All tyres touch the ground.

`node check.mjs`: **OK**, 61,948 geometry triangles.

