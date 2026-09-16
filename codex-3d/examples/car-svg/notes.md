# codex-3d notes

Build dir: `examples/car-svg`  
Format: svg  
Model: gpt-6-astra (high)  
Thread: 01a0ab7f-4681-7131-a5f0-5fccedeebdb4

## Specification

```
Object: side view (profile, nose pointing right) of one low, wide, angular retro-futuristic muscle sports car
Use: 2D hero for a dark website intro; the page will animate it sliding across the screen with spinning wheels, so each wheel must be its own pivot group.
Style: flat vector illustration with subtle gradient shading and crisp highlight strokes; confident silhouette; no stroke heavier than 2 units on a 1000-wide viewBox
Colours: body #F5C518 yellow with a darker #C9971A lower shade; dark glass #1B1F2A with a soft #3A4152 reflection; tyres #15161A; alloys #8C8F99; headlight strip #EAF6FF glow; tail lamp #FF3B3B
Size: viewBox about 1000 x 360, the car fills it with a 20-unit margin
Parts to expose: wheel-front and wheel-rear (pivot at hub centre), body, glass, headlight, taillight, shadow (a soft ellipse under the car)
Constraints: no text, no logos, ground line at the bottom of the viewBox and both tyres touch it
```

## Build

Created [object.svg](object.svg): yellow angular muscle car, subtle shading, glowing headlight, and detailed alloys. XML validation passed; 9.1 KB.

Parts: `body`, `glass`, `door`, `mirror`, `rear-vents`, `front-intake`, `headlight`, `taillight`, `wheel-front`, `wheel-rear`, `shadow`, `ground`.

Animate wheels by appending `rotate(angle)` after their existing hub translations. Translate the SVG container to slide the car. Both tyres touch y=340.

Compromise: fictional styling rather than a specific production model.

## Review pass 1

Updated [object.svg](object.svg):

- Lowered the roof and tightened the framing.
- Removed panel and beltline overlaps inside wheel arches.
- Refined body shading and removed scratch-like glass lines.
- Reduced the front intake and adjusted the mirror.

Preserved wheel pivots and tyre contact. `xmllint` validation passed.

