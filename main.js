import { COLORS, applyMove } from "./cube.js";
import { PLL_NAMES, toHostFrame } from "./pll.js";
import { PllAttack, isResetGesture } from "./attack.js";
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

// Planned order of the cases: the player can drag them before the attack starts.
// (The sandbox has no storage, so it lasts until the plugin is closed.)
let order = [...PLL_NAMES];
let sortable = null; // SortableJS instance, once loaded
const canReorder = () => sortable !== null && (attack.phase === "waiting" || attack.phase === "armed");

function pendingRow(name, reorder) {
  const tr = document.createElement("tr");
  tr.className = "pending";
  tr.dataset.name = name;
  const handle = reorder ? `<button class="handle" aria-label="Move ${name}" title="Drag to reorder">⠿</button>` : "";
  tr.innerHTML = `<td class="handle-cell">${handle}</td><td class="pic">${PLL_DIAGRAMS[name]}</td><td class="name">${name}</td><td class="time">–</td><td class="time">–</td>`;
  return tr;
}

function doneRow(r, i) {
  const tr = document.createElement("tr");
  if (r.name === latest) tr.className = "latest";
  tr.innerHTML = `<td class="idx">${i + 1}</td><td class="name" colspan="2">${r.name}</td><td class="time">${fmt(r.caseTime)}</td><td class="time">${fmt(r.split)}</td>`;
  return tr;
}

// Cases still to do on top (with their picture), then the done ones, most
// recent first: the first PLL done ends up at the bottom.
function renderTable() {
  const reorder = canReorder();
  sortable?.option("disabled", !reorder);
  const pending = order.filter((name) => !attack.isDone(name)).map((name) => pendingRow(name, reorder));
  const done = attack.results.map(doneRow).reverse();
  $("rows").replaceChildren(...pending, ...done);
  $("progress").textContent = `${attack.results.length} / ${PLL_NAMES.length}`;
}

// ---- reordering -------------------------------------------------------------
// Drag (mouse and touch, with autoscroll) by SortableJS. Optional like the 3D
// view: if the CDN fails, the attack works without reordering.

import("sortablejs")
  .then(({ default: Sortable }) => {
    sortable = Sortable.create($("rows"), {
      handle: ".handle",
      draggable: "tr.pending",
      animation: 150,
      forceFallback: true, // same pointer-driven drag for mouse and touch
      ghostClass: "dragging",
      scrollSensitivity: 80, // the sticky header covers the top of the list
      onEnd() {
        order = [...$("rows").querySelectorAll("tr.pending")].map((r) => r.dataset.name);
      },
    });
    renderTable();
  })
  .catch((e) => console.warn("Reordering unavailable", e));

// Keyboard: focus a handle, then arrow up / down.
$("rows").addEventListener("keydown", (e) => {
  const handle = e.target.closest(".handle");
  if (!handle || !canReorder() || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
  e.preventDefault();
  const name = handle.closest("tr").dataset.name;
  const i = order.indexOf(name);
  const j = e.key === "ArrowUp" ? i - 1 : i + 1;
  if (j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  renderTable();
  $("rows").querySelector(`tr[data-name="${name}"] .handle`).focus();
});

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
// acubemy may send a move's new state before or after the move itself, so
// nothing here depends on that order: the view animates each move from what it
// shows, and acubemy's state is applied to it shortly after, only if it differs.

const standalone = window.parent === window;

// A short reward when a PLL is done: the case name pops over the cube with
// its time and a burst of cube-coloured sparks, and the timer pulses.
// Animations are in style.css; each celebration replaces the previous one.
function celebrate(title, time, sparks, big = false) {
  const pop = document.createElement("div");
  pop.className = big ? "pop big" : "pop";
  pop.innerHTML = `<div class="pop-name">${title}</div><div class="pop-time">${time}</div>`;
  const colors = Object.values(COLORS);
  const burst = Array.from({ length: sparks }, (_, i) => {
    const spark = document.createElement("span");
    spark.className = "spark";
    const angle = (i / sparks) * 2 * Math.PI + Math.random() * 0.4;
    const distance = 80 + Math.random() * 70;
    spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    spark.style.setProperty("--rot", `${Math.round(Math.random() * 360)}deg`);
    spark.style.setProperty("--color", colors[i % colors.length]);
    return spark;
  });
  $("celebrate").replaceChildren(pop, ...burst);
  $("timer").animate([{ transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 300, easing: "ease-out" });
}

function handleEvent(event) {
  if (event?.type === "pll" || event?.type === "finish") {
    latest = event.result.name;
    status = { text: "", warn: false }; // the celebration shows the case and its time
    renderTable();
    if (event.type === "pll") celebrate(event.result.name, fmt(event.result.caseTime), 14);
    else celebrate(`All ${PLL_NAMES.length}!`, fmt(event.result.split), 36, true);
  }
  if (event?.type === "repeat") status = { text: `${event.name} already done, it doesn't count`, warn: true };
  renderStatus();
  renderTimer();
}

let viewSync = 0;
function handleState(facelets, now = performance.now()) {
  const event = attack.update(facelets, now);
  // Let the matching move arrive first; then no-op unless the view disagrees.
  clearTimeout(viewSync);
  viewSync = setTimeout(() => view?.setFacelets(attack.facelets), 150);
  handleEvent(event);
}

let recentMoves = []; // the last 4 moves, to spot the U4 / D4 reset gesture

function handleMove(move, now = performance.now()) {
  view?.animateMove(move);
  if (attack.start(now)) {
    status = { text: "", warn: false };
    renderTable(); // drag handles go away once the attack has started
    renderStatus();
    requestAnimationFrame(tick);
  }
  // Opened directly in a browser, acubemy sends no state: simulate it.
  if (standalone) handleState(applyMove(attack.facelets, move), now);

  recentMoves = [...recentMoves, { move, time: now }].slice(-4);
  if (isResetGesture(recentMoves)) restart();
}

acubemy.onMove(({ move }) => handleMove(move));
acubemy.onStateChange((facelets) => handleState(facelets));
// The plugin can start before acubemy has sent the cube state (the SDK then
// reports a solved cube): take the real state once it arrives.
acubemy.onReady(() => {
  if (attack.phase === "waiting" || attack.phase === "armed") attack.restart(acubemy.getFacelets());
  renderAll();
});

function renderDevice() {
  $("device").textContent = device.connected ? device.deviceName ?? "Cube connected" : "No cube connected";
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

// Restart button, or U4 / D4 on the cube (acubemy's reset gesture).
function restart() {
  attack.restart();
  recentMoves = [];
  latest = null;
  status = { text: "", warn: false };
  renderAll();
}

$("restart").addEventListener("click", restart);

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
