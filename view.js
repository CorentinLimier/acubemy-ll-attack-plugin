import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { COLORS, STICKERS, applyMove } from "./cube.js";

const AXES = {
  U: new THREE.Vector3(0, 1, 0),
  D: new THREE.Vector3(0, -1, 0),
  R: new THREE.Vector3(1, 0, 0),
  L: new THREE.Vector3(-1, 0, 0),
  F: new THREE.Vector3(0, 0, 1),
  B: new THREE.Vector3(0, 0, -1),
};

const TURN_MS = 140; // one quarter turn when the queue is empty
const MIN_TURN_MS = 35; // never faster than this, even with a backlog
const GYRO_SMOOTHING_MS = 45; // time constant of the orientation easing

// Without gyro: yellow on top, green in front, turned a bit to show two sides.
const DEFAULT_VIEW = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 6)
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI));

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function createCubeView(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 4.2, 8.5);
  camera.lookAt(0, 0, 0);

  const cube = new THREE.Group();
  cube.quaternion.copy(DEFAULT_VIEW);
  scene.add(cube);

  // 27 cubies, each carrying its own stickers, so a layer can turn on its own.
  const bodyGeometry = new RoundedBoxGeometry(0.97, 0.97, 0.97, 3, 0.08);
  const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const cubies = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const cubie = new THREE.Group();
        cubie.userData.home = new THREE.Vector3(x, y, z);
        cubie.position.set(x, y, z);
        cubie.add(new THREE.Mesh(bodyGeometry, bodyMaterial));
        cube.add(cubie);
        cubies.push(cubie);
      }
    }
  }
  const cubieAt = (pos) => cubies.find((c) => c.userData.home.equals(new THREE.Vector3(...pos)));

  const stickerGeometry = new THREE.PlaneGeometry(0.84, 0.84);
  const stickers = STICKERS.map(({ pos, normal }) => {
    const mesh = new THREE.Mesh(stickerGeometry, new THREE.MeshBasicMaterial({ color: 0x444444 }));
    const n = new THREE.Vector3(...normal);
    mesh.position.copy(n).multiplyScalar(0.486);
    mesh.lookAt(n.clone().multiplyScalar(2));
    cubieAt(pos).add(mesh);
    return mesh;
  });

  function paint(facelets) {
    for (let i = 0; i < 54; i++) stickers[i].material.color.set(COLORS[facelets[i]]);
  }

  // ---- layer turn animation -------------------------------------------------

  const queue = []; // { move, facelets } waiting to be animated
  let turn = null; // the turn being animated
  let latest = null; // the last state asked for: shown, or reached at the end of the queue

  function startNextTurn(now) {
    const next = queue.shift();
    if (!next) return;
    const axis = AXES[next.move[0]];
    // acubemy sends quarter turns only. Clockwise seen from the face = negative angle.
    turn = {
      axis,
      angle: next.move.includes("'") ? Math.PI / 2 : -Math.PI / 2,
      layer: cubies.filter((c) => c.userData.home.dot(axis) > 0.5),
      start: now,
      duration: Math.max(MIN_TURN_MS, TURN_MS / (1 + queue.length)),
      facelets: next.facelets,
    };
  }

  function finishTurn() {
    for (const c of turn.layer) {
      c.position.copy(c.userData.home);
      c.quaternion.identity();
    }
    paint(turn.facelets);
    turn = null;
  }

  const rotation = new THREE.Quaternion();
  function updateTurn(now) {
    if (!turn) startNextTurn(now);
    while (turn) {
      const t = Math.min(1, (now - turn.start) / turn.duration);
      if (t < 1) {
        rotation.setFromAxisAngle(turn.axis, turn.angle * easeOutCubic(t));
        for (const c of turn.layer) {
          c.position.copy(c.userData.home).applyQuaternion(rotation);
          c.quaternion.copy(rotation);
        }
        return true;
      }
      finishTurn();
      startNextTurn(now);
    }
    return false;
  }

  // ---- orientation easing ---------------------------------------------------

  const target = DEFAULT_VIEW.clone();
  function updateOrientation(dt) {
    if (cube.quaternion.angleTo(target) < 1e-4) {
      cube.quaternion.copy(target);
      return false;
    }
    cube.quaternion.slerp(target, 1 - Math.exp(-dt / GYRO_SMOOTHING_MS));
    return true;
  }

  // ---- render loop (runs only while something moves) ------------------------

  let running = false;
  let last = 0;
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    const turning = updateTurn(now);
    const rotating = updateOrientation(dt);
    renderer.render(scene, camera);
    running = turning || rotating || queue.length > 0;
    if (running) requestAnimationFrame(frame);
  }
  function wake() {
    if (running) return;
    running = true;
    requestAnimationFrame((now) => {
      last = now;
      frame(now);
    });
  }

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    wake();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  return {
    /** Show a state right away, dropping pending animations (no-op if the queue already ends on it). */
    setFacelets(facelets) {
      if (facelets === latest) return;
      latest = facelets;
      queue.length = 0;
      if (turn) finishTurn();
      paint(facelets);
      wake();
    },
    /** Animate a quarter turn (acubemy's frame, e.g. "R'") from the state the view ends on. */
    animateMove(move) {
      if (!latest || !AXES[move[0]]) return;
      latest = applyMove(latest, move);
      queue.push({ move, facelets: latest });
      wake();
    },
    /** Gyro orientation, or null for the default view. */
    setQuaternion(q) {
      if (q) target.set(q.x, q.y, q.z, q.w).normalize();
      else target.copy(DEFAULT_VIEW);
      wake();
    },
  };
}
