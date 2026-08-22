/* ==========================================================================
   hero3d.js — WebGL hero scene (Three.js).

   Renders a slowly drifting constellation of polyhedra linked by lines: a
   visual metaphor for the branching paths this app helps a student choose
   between. Everything is procedural geometry, so there are no external
   model files to fetch (nothing can 404 on GitHub Pages).

   Degrades safely:
     - no WebGL / Three.js fails to load -> canvas hidden, CSS gradient
       backdrop remains, page is fully functional.
     - prefers-reduced-motion -> renders one static frame, no animation.
     - pauses rendering when the hero scrolls out of view or the tab is
       hidden, so it costs nothing while the student is using the tool.
   ========================================================================== */

import * as THREE from "three";

const PALETTE = [0x6366f1, 0x8b5cf6, 0x22d3ee, 0x38bdf8, 0xa78bfa];

function initHero3D() {
  const mount = document.getElementById("hero-canvas");
  if (!mount) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch {
    mount.style.display = "none";
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 14);

  // --- lighting -----------------------------------------------------------
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(5, 6, 8);
  scene.add(key);
  const rim = new THREE.PointLight(0x22d3ee, 2.2, 40);
  rim.position.set(-8, -4, 6);
  scene.add(rim);
  const rim2 = new THREE.PointLight(0x8b5cf6, 2.0, 40);
  rim2.position.set(8, 5, -4);
  scene.add(rim2);

  // --- nodes --------------------------------------------------------------
  const group = new THREE.Group();
  scene.add(group);

  const geometries = [
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.OctahedronGeometry(1, 0),
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.TetrahedronGeometry(1, 0),
  ];

  const nodes = [];
  const NODE_COUNT = 11;
  for (let i = 0; i < NODE_COUNT; i++) {
    const geo = geometries[i % geometries.length];
    const color = PALETTE[i % PALETTE.length];
    // Low metalness + an emissive floor keeps the facets bright and saturated
    // against a light page; a metallic finish reads as muddy grey here.
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.42, metalness: 0.08,
      emissive: color, emissiveIntensity: 0.28,
      flatShading: true, transparent: true, opacity: 0.95,
    });
    const mesh = new THREE.Mesh(geo, mat);

    const angle = (i / NODE_COUNT) * Math.PI * 2;
    const radius = 2.9 + (i % 3) * 1.15;
    mesh.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle * 1.3) * 2.0 + (i % 2 ? 0.5 : -0.5),
      Math.sin(angle) * radius * 0.55
    );
    const s = 0.34 + (i % 4) * 0.13;
    mesh.scale.setScalar(s);

    // wireframe halo for definition against light backgrounds
    const halo = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.28 })
    );
    halo.scale.setScalar(1.22);
    mesh.add(halo);

    mesh.userData = {
      spin: new THREE.Vector3((Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.26, 0),
      bob: 0.18 + Math.random() * 0.22,
      phase: Math.random() * Math.PI * 2,
      baseY: mesh.position.y,
    };
    group.add(mesh);
    nodes.push(mesh);
  }

  // --- connecting lines (the "paths") -------------------------------------
  const linePositions = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].position.distanceTo(nodes[j].position) < 4.6) {
        linePositions.push(
          nodes[i].position.x, nodes[i].position.y, nodes[i].position.z,
          nodes[j].position.x, nodes[j].position.y, nodes[j].position.z
        );
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  const lines = new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.26 })
  );
  group.add(lines);

  // --- drifting dust ------------------------------------------------------
  const dustCount = 140;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 26;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 3;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0xa5b4fc, size: 0.07, transparent: true, opacity: 0.7, sizeAttenuation: true })
  );
  scene.add(dust);

  // --- interaction --------------------------------------------------------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduceMotion) {
    window.addEventListener("pointermove", (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  function resize() {
    const w = mount.clientWidth, h = mount.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", resize, { passive: true });

  // Pause when off-screen or tab hidden — no wasted GPU while advising.
  let visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 })
      .observe(mount);
  }

  const clock = new THREE.Clock();
  function render() {
    const t = clock.getElapsedTime();
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;

    group.rotation.y = t * 0.075 + pointer.x * 0.32;
    group.rotation.x = Math.sin(t * 0.16) * 0.09 - pointer.y * 0.18;

    for (const m of nodes) {
      const d = m.userData;
      m.rotation.x += d.spin.x * 0.016;
      m.rotation.y += d.spin.y * 0.016;
      m.position.y = d.baseY + Math.sin(t * 0.7 + d.phase) * d.bob;
    }
    dust.rotation.y = -t * 0.018;
    renderer.render(scene, camera);
  }

  function loop() {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    render();
  }

  resize();
  if (reduceMotion) render();   // one static frame
  else loop();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHero3D);
} else {
  initHero3D();
}
