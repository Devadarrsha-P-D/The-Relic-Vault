import { useRef, useEffect } from "react";
import * as THREE from "three";

/**
 * MythForge — 3D arcane-rune background
 *
 * Concept: not generic "floating particles" — a sparse field of small
 * wireframe shards (the "rune fragment" fragments) drifting along faint
 * gold/emerald arcane ley lines, with a slow parallax tilt on mouse move.
 * Restraint: one bright accent (gold) carries the motion, emerald only
 * flickers on a handful of nodes. Everything else stays dim/dark so the
 * foreground UI (your mint/list/buy flow) stays legible on top.
 *
 * Drop this file in as e.g. src/components/Hero3DBackground.tsx (rename
 * to .tsx if your project uses TS — it's plain JS/JSX, no prop types
 * needed) and render it once, positioned behind your page content:
 *
 *   <div style={{ position: "relative" }}>
 *     <Hero3DBackground />
 *     <div style={{ position: "relative", zIndex: 1 }}>
 *       ...rest of your app...
 *     </div>
 *   </div>
 *
 * Requires: npm install three   (r128 — do not upgrade without checking
 * for breaking API changes elsewhere in the codebase)
 */

const GOLD = 0xd4a017;
const EMERALD = 0x2d6a4f;
const NODE_COUNT = 90;
const LINK_DISTANCE = 5.2;

export default function Hero3DBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // --- scene / camera / renderer ---------------------------------
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f0d09, 0.045);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // --- node field (the "shard" points) ----------------------------
    const nodes = [];
    const nodeGroup = new THREE.Group();

    for (let i = 0; i < NODE_COUNT; i++) {
      const isAccent = Math.random() < 0.12;
      const size = isAccent ? 0.11 : 0.045 + Math.random() * 0.03;

      // sharp-edged geometry — octahedra read as "rune fragment", not
      // the soft spheres every generic three.js background reaches for
      const geo = new THREE.OctahedronGeometry(size, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: isAccent ? EMERALD : GOLD,
        transparent: true,
        opacity: isAccent ? 0.9 : 0.55,
      });
      const mesh = new THREE.Mesh(geo, mat);

      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 14
      );
      mesh.position.copy(pos);

      const drift = new THREE.Vector3(
        (Math.random() - 0.5) * 0.004,
        (Math.random() - 0.5) * 0.004,
        (Math.random() - 0.5) * 0.004
      );

      nodes.push({ mesh, drift, spin: (Math.random() - 0.5) * 0.01 });
      nodeGroup.add(mesh);
    }
    scene.add(nodeGroup);

    // --- link lines (arcane ley lines between nearby shards) ---------
    const lineMat = new THREE.LineBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.16,
    });
    const linkGeo = new THREE.BufferGeometry();
    const maxLinks = NODE_COUNT * 4;
    const linkPositions = new Float32Array(maxLinks * 2 * 3);
    linkGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(linkPositions, 3)
    );
    const linkLines = new THREE.LineSegments(linkGeo, lineMat);
    scene.add(linkLines);

    function rebuildLinks() {
      let ptr = 0;
      for (let i = 0; i < nodes.length && ptr < maxLinks; i++) {
        for (let j = i + 1; j < nodes.length && ptr < maxLinks; j++) {
          const d = nodes[i].mesh.position.distanceTo(nodes[j].mesh.position);
          if (d < LINK_DISTANCE) {
            const a = nodes[i].mesh.position;
            const b = nodes[j].mesh.position;
            const base = ptr * 6;
            linkPositions[base] = a.x;
            linkPositions[base + 1] = a.y;
            linkPositions[base + 2] = a.z;
            linkPositions[base + 3] = b.x;
            linkPositions[base + 4] = b.y;
            linkPositions[base + 5] = b.z;
            ptr++;
          }
        }
      }
      linkGeo.setDrawRange(0, ptr * 2);
      linkGeo.attributes.position.needsUpdate = true;
    }

    // --- pointer parallax --------------------------------------------
    const pointer = { x: 0, y: 0 };
    function handlePointerMove(e) {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    window.addEventListener("mousemove", handlePointerMove);

    // --- resize --------------------------------------------------------
    function handleResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    // --- animation loop -------------------------------------------------
    let frame = 0;
    let rafId;
    function animate() {
      rafId = requestAnimationFrame(animate);
      frame++;

      nodes.forEach(({ mesh, drift, spin }) => {
        mesh.position.add(drift);
        mesh.rotation.x += spin;
        mesh.rotation.y += spin * 0.7;

        // wrap around so the field feels infinite, not a bounded box
        if (mesh.position.x > 13) mesh.position.x = -13;
        if (mesh.position.x < -13) mesh.position.x = 13;
        if (mesh.position.y > 8) mesh.position.y = -8;
        if (mesh.position.y < -8) mesh.position.y = 8;
        if (mesh.position.z > 7) mesh.position.z = -7;
        if (mesh.position.z < -7) mesh.position.z = 7;
      });

      // recompute links every few frames only — this is O(n^2), keep it cheap
      if (frame % 6 === 0) rebuildLinks();

      // slow ambient rotation + subtle pointer parallax
      nodeGroup.rotation.y += 0.0006;
      linkLines.rotation.y = nodeGroup.rotation.y;

      camera.position.x += (pointer.x * 2.2 - camera.position.x) * 0.02;
      camera.position.y += (-pointer.y * 1.4 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();

    // --- cleanup ---------------------------------------------------------
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handlePointerMove);
      nodes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      linkGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(circle at 50% 30%, #1a1510 0%, #0f0d09 70%)",
      }}
      aria-hidden="true"
    />
  );
}