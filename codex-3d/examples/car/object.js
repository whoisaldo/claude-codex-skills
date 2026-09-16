import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const meta = {
  name: 'Vesper GT',
  size: [2.09, 1.25, 4.616],
  parts: ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr', 'steer_fl', 'steer_fr', 'body', 'headlights', 'taillight', 'spoiler'],
};

// +Z forward. Wheel groups rotate about local X; steering groups about Y.
export function createObject() {
  const car = new THREE.Group();
  car.name = 'vesper_gt';
  const parts = car.userData.parts = {};
  const paint = new THREE.MeshPhysicalMaterial({ color: '#F5C518', metalness: 0.28, roughness: 0.29, clearcoat: 1, clearcoatRoughness: 0.18 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#101c22', metalness: 0.04, roughness: 0.21, clearcoat: 0.85, clearcoatRoughness: 0.12 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#141517', metalness: 0, roughness: 0.86 });
  const trim = new THREE.MeshStandardMaterial({ color: '#111417', metalness: 0.15, roughness: 0.65 });
  const alloy = new THREE.MeshStandardMaterial({ color: '#323a42', metalness: 0.88, roughness: 0.28 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#798189', metalness: 0.95, roughness: 0.32 });
  const brake = new THREE.MeshStandardMaterial({ color: '#7b7e81', metalness: 0.86, roughness: 0.44 });
  const recess = new THREE.MeshStandardMaterial({ color: '#040607', roughness: 0.86 });
  const white = new THREE.MeshPhysicalMaterial({ color: '#dbf3ff', emissive: '#c4eaff', emissiveIntensity: 3.2, metalness: 0.1, roughness: 0.17 });
  const red = new THREE.MeshPhysicalMaterial({ color: '#b51019', emissive: '#ff1224', emissiveIntensity: 2.5, metalness: 0.05, roughness: 0.22, clearcoat: 1 });
  const caliperMat = new THREE.MeshStandardMaterial({ color: '#ad7936', metalness: 0.55, roughness: 0.35 });
  const body = new THREE.Group(); body.name = 'body'; car.add(body); parts.body = body;
  function mesh(name, geometry, material, parent = body) {
    const m = new THREE.Mesh(geometry, material); m.name = name;
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(name, size, position, material, radius = 0.012, parent = body) {
    const m = mesh(name, new RoundedBoxGeometry(...size, 1, radius), material, parent);
    m.position.set(...position); return m;
  }
  function line(name, points, radius, material, parent = body) {
    const m = mesh(name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal'), Math.max(12, Math.min(96, points.length * 3)), radius, 6, false), material, parent);
    m.castShadow = false;
    return m;
  }
  function surface(name, rows, material, parent = body) {
    const verts = [], indices = [], n = rows[0].length;
    rows.forEach(row => row.forEach(p => verts.push(...p)));
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + n;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(indices); g.computeVertexNormals();
    return mesh(name, g, material, parent);
  }
  function panel(name, points, material, parent = body) {
    const g = new THREE.BufferGeometry();
    const v = points.flat(); const ix = [];
    for (let i = 1; i < points.length - 1; i++) ix.push(0, i, i + 1);
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(ix); g.computeVertexNormals();
    return mesh(name, g, material, parent);
  }
  function interp(z, entries) {
    for (let i = 1; i < entries.length; i++) if (z <= entries[i][0]) {
      const a = entries[i - 1], b = entries[i], t = (z - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * t;
    }
    return entries.at(-1)[1];
  }
  // Monotone cubic station interpolation avoids faceted reflection bands.
  function fair(z, entries) {
    const last = entries.length - 1;
    if (z <= entries[0][0]) return entries[0][1];
    if (z >= entries[last][0]) return entries[last][1];
    const secant = i => (entries[i + 1][1] - entries[i][1]) / (entries[i + 1][0] - entries[i][0]);
    const tangent = i => {
      if (i === 0) return secant(0);
      if (i === last) return secant(last - 1);
      const a = secant(i - 1), b = secant(i);
      return a * b <= 0 ? 0 : 2 * a * b / (a + b);
    };
    for (let i = 0; i < last; i++) if (z <= entries[i + 1][0]) {
      const h = entries[i + 1][0] - entries[i][0], t = (z - entries[i][0]) / h;
      return (2*t*t*t-3*t*t+1)*entries[i][1] + (t*t*t-2*t*t+t)*h*tangent(i)
        + (-2*t*t*t+3*t*t)*entries[i+1][1] + (t*t*t-t*t)*h*tangent(i+1);
    }
  }
  const axleZ = [-1.39, 1.36], wheelY = 0.35, archR = 0.414;
  const widthAt = z => fair(z, [[-2.27, .83], [-2.05, .93], [-1.59, .975], [-1.12, .968], [-.45, .924], [.52, .921], [1.15, .96], [1.6, .96], [2.12, .904], [2.27, .83]]);
  const topAt = z => fair(z, [[-2.27, .76], [-2.02, .84], [-1.38, .868], [-.65, .865], [.5, .856], [1.4, .828], [2.06, .742], [2.27, .68]]);
  function opening(z) {
    let y = .235;
    axleZ.forEach(c => { const d = z - c; if (Math.abs(d) <= archR + 1e-8) y = Math.max(y, wheelY + Math.sqrt(Math.max(0, archR * archR - d * d))); });
    return y;
  }
  const zs = new Set([-2.27, -2.22, -2.12, -2.05, -2.02, -1.59, -1.38, -1.12, -.65, -.45, .5, .52, 1.15, 1.4, 1.6, 2.06, 2.12, 2.22, 2.27]);
  for (let z = -2.25; z <= 2.25; z += .07) zs.add(z);
  axleZ.forEach(c => {
    zs.add(c - archR - .001); zs.add(c + archR + .001);
    for (let i = 0; i <= 40; i++) zs.add(c + archR * Math.cos(i * Math.PI / 40));
  });
  const stations = [...zs].sort((a, b) => a - b);
  function ring(z) {
    const w = widthAt(z), h = topAt(z), b = opening(z);
    const side = [[0, h + .017], [.59 * w, h + .012], [.86 * w, h], [w, h - .027], [w - .006, b + .025], [w - .042, b], [.626, b], [.626, .18], [0, .18]];
    return [...side, ...side.slice(1, -1).reverse().map(([x, y]) => [-x, y])].map(([x, y]) => [x, y, z]);
  }
  const rings = stations.map(ring), n = rings[0].length;
  // Weld the broad upper panels so highlights flow across the hood and haunches.
  surface('upper_coachwork', rings.map(r => [r[n - 2], r[n - 1], r[0], r[1], r[2]]), paint);
  for (let i = 2; i < n - 2; i++) surface('coachwork_strip_' + i, rings.map(r => [r[i], r[(i + 1) % n]]), paint);
  function sideX(y, z) {
    const r = ring(z);
    for (let i = 0; i < 5; i++) {
      const a = r[i], b = r[i + 1];
      if (y <= a[1] && y >= b[1]) return THREE.MathUtils.lerp(a[0], b[0], (a[1] - y) / (a[1] - b[1]));
    }
    return r[4][0];
  }
  function topY(x, z) {
    const r = ring(z), xx = Math.abs(x);
    for (let i = 0; i < 3; i++) if (xx <= r[i + 1][0])
      return THREE.MathUtils.lerp(r[i][1], r[i + 1][1], (xx - r[i][0]) / (r[i + 1][0] - r[i][0]));
    return r[3][1];
  }
  for (const [z, front] of [[-2.27, false], [2.27, true]]) {
    const r = ring(z), pts = r.map(p => new THREE.Vector2(p[0], p[1]));
    const tri = THREE.ShapeUtils.triangulateShape(pts, []);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(r.flat(), 3));
    g.setIndex(tri.flatMap(t => front ? t : [...t].reverse())); g.computeVertexNormals();
    mesh(front ? 'nose_panel' : 'rear_panel', g, paint);
  }
  box('undertray', [1.26, .06, 3.94], [0, .185, 0], trim, .022);
  for (const s of [-1, 1]) {
    const sideName = s > 0 ? 'left' : 'right';
    box('rocker_' + sideName, [.074, .082, 1.94], [s * .894, .219, -.015], trim, .018);
    line('rocker_chrome_' + sideName, Array.from({length: 33}, (_, i) => { const z = -.93 + 1.86 * i / 32; return [s * (sideX(.274, z) + .002), .274, z]; }), .0025, alloy);
    axleZ.forEach((z, idx) => {
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const a = i / 48 * Math.PI, zz = z + archR * Math.cos(a);
        pts.push([s * (widthAt(zz) - .024), wheelY + archR * Math.sin(a) + .012, zz]);
      }
      line('arch_edge_' + sideName + '_' + idx, pts, .004, paint);
      // Dark inner arch, inboard of the tyre. Its opening remains physically empty.
      const rows = [];
      for (let i = 0; i <= 48; i++) {
        const a = i / 48 * Math.PI, zz = z + .403 * Math.cos(a), yy = wheelY + .403 * Math.sin(a);
        rows.push([[s * .638, yy, zz], [s * .88, yy, zz]]);
      }
      const liner = surface('wheelhouse_' + sideName + '_' + idx, rows, trim);
      liner.material = trim;
      // All liner normals point into the wheel well.
      if (s < 0) { const ix = liner.geometry.index; for (let j = 0; j < ix.count; j += 3) { const b = ix.getX(j + 1); ix.setX(j + 1, ix.getX(j + 2)); ix.setX(j + 2, b); } liner.geometry.computeVertexNormals(); }
    });
  }

  // A continuous glass canopy, with painted roof and pillars seated on its edges.
  const cabin = [
    { z: -1.64, w: .777, y: .856, crown: .876 },
    { z: -.96, w: .657, y: 1.187, crown: 1.222 },
    { z: -.24, w: .651, y: 1.211, crown: 1.25 },
    { z: .59, w: .805, y: .852, crown: .873 },
  ];
  function roofRow(c) { return Array.from({length: 13}, (_, i) => i / 6 - 1).map(t => [t * c.w, c.y + (c.crown - c.y) * (1 - t * t), c.z]); }
  const glassTwoSides = glass.clone(); glassTwoSides.side = THREE.DoubleSide;
  surface('rear_windscreen', [roofRow(cabin[0]), roofRow(cabin[1])], glassTwoSides);
  surface('roof', [roofRow(cabin[1]), roofRow({ z: -.64, w: .665, y: 1.212, crown: 1.249 }), roofRow(cabin[2])], paint);
  surface('windscreen', [roofRow(cabin[2]), roofRow(cabin[3])], glassTwoSides);
  for (const s of [-1, 1]) {
    const suffix = s > 0 ? 'left' : 'right';
    const A = [s * .805, .853, .59], B = [s * .651, 1.211, -.24], C = [s * .657, 1.187, -.96], D = [s * .777, .856, -1.64];
    const along = (a, b, t) => a.map((v, i) => THREE.MathUtils.lerp(v, b[i], t));
    const roofSide = u => {
      const z = THREE.MathUtils.lerp(-.96, -.24, u);
      return [s * interp(z, [[-.96, .657], [-.64, .665], [-.24, .651]]),
        interp(z, [[-.96, 1.187], [-.64, 1.212], [-.24, 1.211]]), z];
    };
    const E = roofSide(.20), F = along(D, A, .20);
    // The pillar and window share exact edges; no overlapping sail over the glass.
    const windowStations = [.20, .36, 4 / 9, .6, .8, 1];
    surface('side_glass_' + suffix, [windowStations.map(u => along(D, A, u)), windowStations.map(roofSide)], glassTwoSides);
    const sail = surface('sail_panel_' + suffix, [[D, F], [C, E]], paint);
    if (s < 0) {
      const ix = sail.geometry.index;
      for (let j = 0; j < ix.count; j += 3) {
        const b = ix.getX(j + 1); ix.setX(j + 1, ix.getX(j + 2)); ix.setX(j + 2, b);
      }
      sail.geometry.computeVertexNormals();
    }
    line('a_pillar_' + suffix, [A, along(A, B, .5), B], .018, paint);
    line('roof_rail_' + suffix, [B, [s * .665, 1.212, -.64], C], .013, paint);
    line('rear_pillar_' + suffix, [C, along(C, D, .5), D], .014, paint);
    line('window_sill_' + suffix, [D, along(D, A, .5), A], .009, trim);
    line('b_pillar_' + suffix, [roofSide(.36), along(D, A, .36)], .012, trim);
    // Sample the seam on the actual body surface, rather than guessing its X.
    const seamPath = new THREE.CatmullRomCurve3([
      [0, .843, .55], [0, .73, .68], [0, .39, .65], [0, .307, .53],
      [0, .307, -.65], [0, .39, -.79], [0, .70, -.81], [0, .85, -.85],
    ].map(p => new THREE.Vector3(...p)), false, 'centripetal');
    const seamPoints = seamPath.getPoints(96).map(p => [s * (sideX(p.y, p.z) + .0016), p.y, p.z]);
    line('door_seam_' + suffix, seamPoints, .0013, recess);
    box('flush_handle_' + suffix, [.009, .018, .13], [s * (sideX(.751, -.59) + .004), .751, -.59], alloy, .004);
    line('mirror_stalk_' + suffix, [[s * .801, .886, .38], [s * .918, .93, .355], [s * .962, .947, .33]], .015, trim);
    const mirror = box('mirror_housing_' + suffix, [.164, .074, .226], [s * .949, .97, .327], paint, .032);
    mirror.rotation.y = s * -.13;
    const mirrorGlass = box('mirror_glass_' + suffix, [.128, .047, .007], [s * .948, .971, .211], chrome, .014);
    mirrorGlass.rotation.y = s * -.13;
    // The creases are built into the hood surface, without raised tubes.
    const vent = box('hood_extractor_' + suffix, [.128, .012, .29], [s * .66, topAt(.76) + .008, .76], trim, .015);
    vent.rotation.x = .033;
    for (let k = 0; k < 5; k++) box('extractor_blade_' + suffix + '_' + k, [.116, .009, .012], [s * .66, topAt(.76) + .017, .65 + k * .052], alloy, .003);
  }
  // Front fascia: a recessed continuous LED blade above a deep lower intake.
  box('front_lamp_recess', [1.704, .089, .038], [0, .611, 2.274], recess, .022);
  parts.headlights = box('headlights', [1.634, .025, .017], [0, .626, 2.296], white, .009);
  box('front_intake', [1.45, .182, .034], [0, .382, 2.28], recess, .035);
  box('intake_upper_lip', [1.514, .027, .065], [0, .493, 2.254], paint, .009);
  for (let i = -10; i <= 10; i++) box('intake_fin_' + (i + 10), [.005, .129, .01], [i * .062, .381, 2.298], trim, .003);
  for (const s of [-1, 1]) {
    box('front_brake_duct_' + s, [.11, .137, .028], [s * .79, .393, 2.272], trim, .021);
  }
  // Swept splitter follows the wedge nose rather than using a rectangular slab.
  function horizontalExtrusion(name, outline, height, y, material, parent = body) {
    const sh = new THREE.Shape(); outline.forEach(([x, z], i) => i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: height, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .008, bevelThickness: .008, curveSegments: 8 });
    g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return mesh(name, g, material, parent);
  }
  horizontalExtrusion('front_splitter', [[-.94, 1.91], [-.936, 2.19], [-.79, 2.3], [.79, 2.3], [.936, 2.19], [.94, 1.91]], .045, .188, trim);
  box('rear_lamp_recess', [1.696, .091, .036], [0, .674, -2.277], recess, .021);
  parts.taillight = box('taillight', [1.623, .031, .018], [0, .681, -2.296], red, .009);
  box('rear_valance', [1.59, .204, .035], [0, .361, -2.277], trim, .04);
  horizontalExtrusion('diffuser', [[-.82, -1.88], [-.876, -2.18], [-.76, -2.30], [.76, -2.30], [.876, -2.18], [.82, -1.88]], .039, .175, trim);
  for (let i = -3; i <= 3; i++) {
    const fin = box('diffuser_strake_' + (i + 3), [.014, .111, .35], [i * .18, .232, -2.092], trim, .004); fin.rotation.x = -.12;
  }
  // A low folded lip follows the deck; every edge is closed into the coachwork.
  const spoiler = new THREE.Group(); spoiler.name = 'spoiler'; body.add(spoiler); parts.spoiler = spoiler;
  const duckRows = [
    { z: -2.02, w: .916, crest: 0 },
    { z: -2.205, w: .849, crest: .032 },
    { z: -2.228, w: .837, crest: .018 },
    { z: -2.228, w: .837, crest: null },
  ].map(({z, w, crest}) => [-1, -.75, -.5, 0, .5, .75, 1].map(t => [
    t * w, crest === null ? topY(t * w, z) - .009 : topY(t * .916, -2.02) + crest, z,
  ]));
  const lip = surface('ducktail_shell', duckRows, paint, spoiler);
  const ix = lip.geometry.index;
  for (let j = 0; j < ix.count; j += 3) {
    const b = ix.getX(j + 1); ix.setX(j + 1, ix.getX(j + 2)); ix.setX(j + 2, b);
  }
  lip.geometry.computeVertexNormals();
  for (const side of [0, 6]) {
    const pts = duckRows.map(row => row[side]);
    if (side === 6) pts.reverse();
    panel('ducktail_end_' + side, pts, paint, spoiler);
  }

  function latheX(name, profile, material, parent, segments = 64) {
    const g = new THREE.LatheGeometry(profile.map(([r, x]) => new THREE.Vector2(r, x)), segments);
    g.rotateZ(-Math.PI / 2); return mesh(name, g, material, parent);
  }
  function cylinderX(name, radius, depth, x, material, parent, segments = 64) {
    const g = new THREE.CylinderGeometry(radius, radius, depth, segments); g.rotateZ(-Math.PI / 2);
    const m = mesh(name, g, material, parent); m.position.x = x; return m;
  }
  for (const [id, s, z, front] of [['fl', 1, 1.36, true], ['fr', -1, 1.36, true], ['rl', 1, -1.39, false], ['rr', -1, -1.39, false]]) {
    const carrier = new THREE.Group(); carrier.name = front ? 'steer_' + id : 'hub_carrier_' + id;
    carrier.position.set(s * .809, wheelY, z); body.add(carrier);
    if (front) parts[carrier.name] = carrier;
    const wheel = new THREE.Group(); wheel.name = 'wheel_' + id; carrier.add(wheel); parts[wheel.name] = wheel;
    wheel.userData.spinAxis = 'x'; wheel.userData.radius = .35;
    // Closed rounded tyre section; max radius .350 gives exact ground contact.
    latheX('tyre_' + id, [[.268, -.143], [.304, -.145], [.331, -.127], [.346, -.105], [.35, -.075], [.35, -.059], [.347, -.057], [.347, -.053], [.35, -.051], [.35, -.004], [.347, -.002], [.347, .002], [.35, .004], [.35, .051], [.347, .053], [.347, .057], [.35, .059], [.35, .075], [.346, .105], [.331, .127], [.304, .145], [.268, .143], [.264, .122], [.264, -.122], [.268, -.143]], rubber, wheel, 96);
    for (const side of [-1, 1]) {
      latheX('tyre_bead_' + id + '_' + side, [[.273, side * .14], [.279, side * .145], [.286, side * .144], [.288, side * .14]], rubber, wheel);
    }
    // Barrel is hollow, so the rotor remains visible between the five spokes.
    latheX('rim_barrel_' + id, [[.259, -.133], [.272, -.133], [.276, -.117], [.276, .117], [.272, .133], [.259, .133], [.254, .116], [.254, -.116], [.259, -.133]], alloy, wheel);
    latheX('machined_rim_lip_' + id, [[.259, s * .128], [.263, s * .143], [.27, s * .144], [.274, s * .134]], chrome, wheel);
    cylinderX('brake_rotor_' + id, .229, .018, s * .075, brake, wheel);
    cylinderX('rotor_hat_' + id, .098, .026, s * .086, alloy, wheel);
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2;
      for (const r of [.178, .207]) {
        const hole = cylinderX('rotor_drill_' + id + '_' + k + '_' + r, .006, .0015, s * .085, recess, wheel, 8);
        hole.position.y = r * Math.cos(a + (r > .2 ? .065 : 0)); hole.position.z = r * Math.sin(a + (r > .2 ? .065 : 0));
      }
    }
    // Fixed caliper is attached to the steering carrier, never to the spinning wheel.
    box('brake_caliper_' + id, [.071, .142, .082], [s * .074, .019, -.2], caliperMat, .022, carrier);
    for (let k = 0; k < 5; k++) {
      const shape = new THREE.Shape();
      shape.moveTo(-.032, .056); shape.lineTo(.026, .056); shape.lineTo(.036, .16); shape.lineTo(.026, .264); shape.lineTo(-.034, .264); shape.lineTo(-.018, .158); shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: .022, bevelEnabled: true, bevelSize: .005, bevelThickness: .005, bevelSegments: 2, steps: 1 });
      // Shape X -> wheel Z, shape Y -> wheel Y, extrusion -> axle X.
      const pos = g.attributes.position;
      for (let j = 0; j < pos.count; j++) { const u = pos.getX(j), v = pos.getY(j), d = pos.getZ(j); pos.setXYZ(j, s * (.103 + d - .025 * (v / .264)), v, -s * u); }
      g.computeVertexNormals();
      const spoke = mesh('spoke_' + id + '_' + k, g, alloy, wheel); spoke.rotation.x = k * Math.PI * 2 / 5;
    }
    cylinderX('center_cap_' + id, .062, .039, s * .123, alloy, wheel);
    for (let k = 0; k < 5; k++) {
      const a = k * Math.PI * 2 / 5;
      const lug = cylinderX('lug_' + id + '_' + k, .008, .007, s * .146, chrome, wheel, 6);
      lug.position.y = Math.cos(a) * .043; lug.position.z = Math.sin(a) * .043;
    }
  }
  car.userData.animation = { wheelSpinAxis: 'x', steeringAxis: 'y', wheelRadius: .35, wheelbase: 2.75 };
  return car;
}
