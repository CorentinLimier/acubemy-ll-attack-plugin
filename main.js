import { applyMove, isValidFacelets } from "./cube.js";
import { PLL_NAMES, toHostFrame } from "./pll.js";
import { PllAttack } from "./attack.js";
import { PLL_DIAGRAMS } from "./diagram.js";

const $ = (id) => document.getElementById(id);

const attack = new PllAttack(acubemy.getFacelets());
let status = { text: "", warn: false };
let latest = null; // name of the last PLL solved
let view = null;
let device = acubemy.getDevice();

// The 3D view is optional: if WebGL or the CDN fails, the attack still works.
import("./view.js")
  .then(({ createCubeView }) => {
    view = createCubeView($("view"));
    view.setFacelets(attack.facelets);
  })
  .catch((e) => {
    console.warn("3D view unavailable", e);
    $("view").hidden = true;
  });

// ---- formatting -----------------------------------------------------------

function fmt(ms) {
  const cs = Math.floor(ms / 10);
  const s = Math.floor(cs / 100);
  const frac = String(cs % 100).padStart(2, "0");
  if (s < 60) return `${s}.${frac}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}.${frac}`;
}

// ---- rendering ------------------------------------------------------------

function renderTable() {
  const rows = attack.results.map((r, i) => {
    const tr = document.createElement("tr");
    if (r.name === latest) tr.className = "latest";
    tr.innerHTML = `<td>${i + 1}</td><td class="pic">${PLL_DIAGRAMS[r.name]}</td><td>${r.name}</td><td>${fmt(r.caseTime)}</td><td>${fmt(r.split)}</td>`;
    return tr;
  });
  for (const name of PLL_NAMES) {
    if (attack.isDone(name)) continue;
    const tr = document.createElement("tr");
    tr.className = "pending";
    tr.innerHTML = `<td></td><td class="pic">${PLL_DIAGRAMS[name]}</td><td>${name}</td><td>–</td><td>–</td>`;
    rows.push(tr);
  }
  $("rows").replaceChildren(...rows);
  $("progress").textContent = `${attack.results.length} / ${PLL_NAMES.length}`;
}

function defaultStatus() {
  switch (attack.phase) {
    case "waiting": return { text: "Solve F2L and the yellow face, or reset the cube state in acubemy", warn: true };
    case "armed": return { text: "Ready: the timer starts at your first move", warn: false };
    case "finished": return { text: `All ${PLL_NAMES.length} PLLs in ${fmt(attack.elapsed())}`, warn: false };
    default: return { text: "Go!", warn: false };
  }
}

function renderStatus() {
  const s = status.text && attack.phase === "running" ? status : defaultStatus();
  $("status").textContent = s.text;
  $("status").className = s.warn ? "warn" : "";
}

function renderTimer() {
  $("timer").textContent = fmt(attack.elapsed(performance.now()));
  $("timer").className = attack.phase === "finished" ? "finished" : "";
}

function renderAll() {
  renderTable();
  renderStatus();
  renderTimer();
  view?.setFacelets(attack.facelets);
}

function tick() {
  renderTimer();
  if (attack.phase === "running") requestAnimationFrame(tick);
}

// ---- cube events ----------------------------------------------------------
// acubemy's tracked state is the reference. The SDK calls onMove listeners
// *before* it stores the new facelets, so getFacelets() inside onMove would
// still give the old state: we read the new one in onStateChange instead.
// Both fire in the same message, so a PLL is timed at the move that ends it.

const standalone = window.parent === window;

function handleEvent(event) {
  if (event?.type === "pll" || event?.type === "finish") {
    latest = event.result.name;
    status = { text: `${event.result.name}  ${fmt(event.result.caseTime)}`, warn: false };
    renderTable();
  }
  if (event?.type === "repeat") status = { text: `${event.name} already done, it doesn't count`, warn: true };
  renderStatus();
  renderTimer();
}

// The move that the next state change comes from, so the view can animate it.
// onStateChange fires synchronously right after onMove in the same message.
let pendingMove = null;

function handleState(facelets, now = performance.now()) {
  if (!isValidFacelets(facelets)) return;
  const event = attack.update(facelets, now);
  if (pendingMove) view?.animateMove(pendingMove, facelets);
  else view?.setFacelets(facelets);
  pendingMove = null;
  handleEvent(event);
}

function handleMove(move, now = performance.now()) {
  pendingMove = move;
  queueMicrotask(() => (pendingMove = null)); // no state followed: don't animate it later
  if (attack.start(now)) {
    status = { text: "", warn: false };
    renderStatus();
    requestAnimationFrame(tick);
  }
  // Opened directly in a browser, acubemy sends no state: simulate it.
  if (standalone) handleState(applyMove(attack.facelets, move), now);
}

acubemy.onMove(({ move }) => handleMove(move));
acubemy.onStateChange((facelets) => handleState(facelets));
acubemy.onReady(() => handleState(acubemy.getFacelets()));

function renderDevice() {
  $("device").textContent = device.connected ? device.deviceName ?? "Cube connected" : "No cube connected";
  $("calibrate").disabled = !device.hasGyro;
  if (!device.hasGyro) view?.setQuaternion(null);
}
acubemy.onDeviceChange((d) => {
  device = d;
  renderDevice();
});

acubemy.onGyro((q) => {
  if (device.hasGyro) view?.setQuaternion(q);
});

// ---- buttons --------------------------------------------------------------

$("restart").addEventListener("click", () => {
  attack.restart();
  latest = null;
  status = { text: "", warn: false };
  renderAll();
});

$("calibrate").addEventListener("click", () => acubemy.calibrateGyro());

renderDevice();
renderAll();

// Opened directly in a browser (no acubemy): the SDK maps keys U R F D L B to
// turns of acubemy's frame (U = white). For testing, play yellow-on-top algs
// from the console: pllAttack.play("R U R' U' R' F R2 U' R' U' R U R' F'")
if (standalone) {
  window.pllAttack = {
    attack,
    play(alg) {
      for (const m of toHostFrame(alg).trim().split(/\s+/)) {
        const turns = m.endsWith("2") ? [m[0], m[0]] : [m];
        turns.forEach((t) => handleMove(t));
      }
    },
  };
}
