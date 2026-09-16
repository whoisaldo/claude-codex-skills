// Contract check for ./object.js. Run with: node check.mjs
// Needs `three` resolvable (the build script links node_modules in for the run).
import * as THREE from 'three';

const fmt = v => (Math.round(v * 1000) / 1000).toString();
const problems = [];
const warnings = [];

let mod;
try {
  mod = await import('./object.js?v=' + Date.now());
} catch (err) {
  console.error('FAIL: object.js could not be imported\n' + (err && err.stack || err));
  process.exit(1);
}
if (typeof mod.createObject !== 'function') problems.push('missing export: createObject()');
if (!mod.meta || typeof mod.meta !== 'object') problems.push('missing export: meta');

let group = null;
if (typeof mod.createObject === 'function') {
  try {
    group = mod.createObject();
  } catch (err) {
    console.error('FAIL: createObject() threw\n' + (err && err.stack || err));
    process.exit(1);
  }
  if (!group || !group.isObject3D) problems.push('createObject() must return a THREE.Object3D (ideally a Group)');
}

if (group && group.isObject3D) {
  // Measure the rest pose (t = 0); an idle animation may legitimately move parts later.
  if (typeof mod.updateObject === 'function') {
    try { mod.updateObject(group, 0, 0); }
    catch (err) { problems.push('updateObject(group, 0, 0) threw: ' + (err && err.message || err)); }
  }
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  if (typeof mod.updateObject === 'function') {
    try { mod.updateObject(group, 1.5, 0.016); }
    catch (err) { problems.push('updateObject(group, 1.5, 0.016) threw: ' + (err && err.message || err)); }
  }
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  let tris = 0, meshes = 0, unnamed = 0, lights = 0, cameras = 0;
  const names = [];
  group.traverse(o => {
    if (o === group) return;
    if (o.isLight) lights++;
    if (o.isCamera) cameras++;
    if (o.name) names.push(o.name);
    if (o.isMesh) {
      meshes++;
      if (!o.name) unnamed++;
      const g = o.geometry;
      if (g && g.attributes && g.attributes.position) {
        const n = g.index ? g.index.count : g.attributes.position.count;
        tris += Math.floor(n / 3);
      }
    }
  });
  const longest = Math.max(size.x, size.y, size.z);
  const tol = Math.max(longest * 0.01, 1e-4);

  if (!isFinite(longest) || longest <= 0) problems.push('object has no visible geometry (empty bounding box)');
  if (Math.abs(box.min.y) > tol) problems.push(`object must rest on y = 0 (lowest point is y = ${fmt(box.min.y)})`);
  if (Math.abs(center.x) > tol * 5) problems.push(`object must be centred on x = 0 (centre x = ${fmt(center.x)})`);
  if (Math.abs(center.z) > tol * 5) problems.push(`object must be centred on z = 0 (centre z = ${fmt(center.z)})`);
  if (tris > 200000) problems.push(`too many triangles: ${tris.toLocaleString()} (limit 200,000)`);
  if (lights) problems.push(`object contains ${lights} light(s); the viewer supplies lighting`);
  if (cameras) problems.push(`object contains ${cameras} camera(s)`);
  if (meshes === 0) problems.push('object contains no meshes');
  if (unnamed > 0) warnings.push(`${unnamed} of ${meshes} meshes are unnamed`);
  const parts = group.userData && group.userData.parts;
  if (!parts || typeof parts !== 'object' || Object.keys(parts).length === 0) {
    warnings.push('group.userData.parts is empty; callers cannot find animatable parts');
  } else {
    for (const [k, v] of Object.entries(parts)) {
      if (!v || !v.isObject3D) problems.push(`userData.parts.${k} is not an Object3D`);
    }
  }
  if (mod.meta && Array.isArray(mod.meta.size)) {
    const [w, h, d] = mod.meta.size;
    const off = Math.max(Math.abs(w - size.x), Math.abs(h - size.y), Math.abs(d - size.z));
    if (off > longest * 0.15) warnings.push(`meta.size ${JSON.stringify(mod.meta.size)} differs from measured ${[size.x, size.y, size.z].map(fmt)}`);
  }

  console.log(`size      ${fmt(size.x)} x ${fmt(size.y)} x ${fmt(size.z)} m  (x/width, y/height, z/depth)`);
  console.log(`bounds    y ${fmt(box.min.y)}..${fmt(box.max.y)}  x ${fmt(box.min.x)}..${fmt(box.max.x)}  z ${fmt(box.min.z)}..${fmt(box.max.z)}`);
  console.log(`meshes    ${meshes}  (${tris.toLocaleString()} triangles)`);
  console.log(`named     ${names.length}: ${names.slice(0, 40).join(', ')}${names.length > 40 ? ', ...' : ''}`);
  console.log(`parts     ${parts ? Object.keys(parts).join(', ') : '(none)'}`);
  console.log(`update    ${typeof mod.updateObject === 'function' ? 'yes' : 'no'}`);
}

for (const w of warnings) console.log('WARN  ' + w);
for (const p of problems) console.log('FAIL  ' + p);
if (problems.length) { console.log(`\n${problems.length} contract problem(s). Fix object.js and re-run node check.mjs`); process.exit(1); }
console.log('\nOK  object.js satisfies the codex-3d contract');
