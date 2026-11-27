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

// Planned order of the cases: the player can drag them before the attack starts.
// (The sandbox has no storage, so it lasts until the plugin is closed.)
let order = [...PLL_NAMES];
const canReorder = () => attack.phase === "waiting" || attack.phase === "armed";

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
  endDrag(false);
  const reorder = canReorder();
  const pending = order.filter((name) => !attack.isDone(name)).map((name) => pendingRow(name, reorder));
  const done = attack.results.map(doneRow).reverse();
  $("rows").replaceChildren(...pending, ...done);
  $("plan-hint").hidden = !reorder;
  $("progress").textContent = `${attack.results.length} / ${PLL_NAMES.length}`;
}

// ---- reordering (pointer drag, works with mouse and touch) -----------------

let drag = null; // { row, y, frame }

function pendingRows() {
  return [...$("rows").querySelectorAll("tr.pending")];
}

function placeDraggedRow(y) {
  const others = pendingRows().filter((r) => r !== drag.row);
  const before = others.find((r) => {
    const box = r.getBoundingClientRect();
    return y < box.top + box.height / 2;
  });
  if (before) {
    if (drag.row.nextSibling !== before) $("rows").insertBefore(drag.row, before);
  } else if (others.length) {
    others[others.length - 1].after(drag.row);
  }
}

// Scroll the list (or the page on narrow screens) when dragging near an edge.
function autoScroll() {
  if (!drag) return;
  const box = document.querySelector(".table");
  const scrollsItself = box.scrollHeight > box.clientHeight;
  // The sticky header covers the top of the list: the scroll-up zone starts below it.
  const headerBottom = box.querySelector("th").getBoundingClientRect().bottom; // th is the sticky part
  const top = scrollsItself ? headerBottom : 0;
  const bottom = scrollsItself ? box.getBoundingClientRect().bottom : window.innerHeight;
  const edge = 56;
  let speed = 0;
  if (drag.y < top + edge) speed = -Math.max(4, (top + edge - drag.y) / 2);
  else if (drag.y > bottom - edge) speed = Math.max(4, (drag.y - bottom + edge) / 2);
  if (speed) {
    if (scrollsItself) box.scrollTop += speed;
    else window.scrollBy(0, speed);
    placeDraggedRow(drag.y);
  }
  drag.frame = requestAnimationFrame(autoScroll);
}

function endDrag(commit) {
  if (!drag) return;
  cancelAnimationFrame(drag.frame);
  drag.row.classList.remove("dragging");
  document.body.classList.remove("reordering");
  drag = null;
  if (commit) {
    const planned = pendingRows().map((r) => r.dataset.name);
    order = [...planned, ...order.filter((name) => !planned.includes(name))];
  }
}

// The tbody keeps the pointer capture: the dragged row itself moves in the DOM.
$("rows").addEventListener("pointerdown", (e) => {
  const handle = e.target.closest(".handle");
  if (!handle || !canReorder() || e.button > 0) return;
  e.preventDefault();
  const row = handle.closest("tr");
  drag = { row, y: e.clientY, frame: 0 };
  row.classList.add("dragging");
  document.body.classList.add("reordering");
  $("rows").setPointerCapture(e.pointerId);
  drag.frame = requestAnimationFrame(autoScroll);
});
$("rows").addEventListener("pointermove", (e) => {
  if (!drag) return;
  drag.y = e.clientY;
  placeDraggedRow(e.clientY);
});
$("rows").addEventListener("pointerup", () => endDrag(true));
$("rows").addEventListener("pointercancel", () => endDrag(true));

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
// The view animates each move from onMove (attack.facelets is still the state
// before it) and ignores the matching state change that follows.

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

function handleState(facelets, now = performance.now()) {
  if (!isValidFacelets(facelets)) return;
  const event = attack.update(facelets, now);
  view?.setFacelets(facelets); // no-op when it's the state the move animation ends on
  handleEvent(event);
}

function handleMove(move, now = performance.now()) {
  view?.animateMove(move, applyMove(attack.facelets, move));
  if (attack.start(now)) {
    status = { text: "", warn: false };
    renderTable(); // drag handles go away once the attack has started
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
