import { SOLVED, isF2LState, isPllState } from "./cube.js";
import { PLL_NAMES, identifyPll } from "./pll.js";
import { OLL_NAMES, identifyOll } from "./oll.js";

/**
 * The attacks, by title ("PLL"): each one's cases, the states it starts each
 * case from (`isBaseline`) and how it tells which case took one such state to
 * the next. For the UI: `solveFirst`, what to solve before starting, and
 * `label`, how a case is named over the cube.
 * `mergeMs`: some OLL algs are two shorter OLL algs in a row (OLL 18 is OLL 7,
 * U2, OLL 8), so F2L is solved in the middle of them. When the alg goes on
 * within `mergeMs` of such a state, it is either two cases or one: the plugin
 * picks the one that gets the earliest case of the planned order still to do.
 */
export const MODES = Object.fromEntries(
  [
    { title: "PLL", names: PLL_NAMES, isBaseline: isPllState, identify: identifyPll, solveFirst: "F2L and the yellow face", label: (name) => name },
    { title: "OLL", names: OLL_NAMES, isBaseline: isF2LState, identify: identifyOll, solveFirst: "F2L", label: (name) => `OLL ${name}`, mergeMs: 500 },
  ].map((mode) => [mode.title, mode])
);

/**
 * Time attack state machine. Feed it the cube's facelets after every move
 * (update) and the time of each move (start); it detects each case and keeps
 * the splits.
 *
 * Phases: "waiting" (cube not in a baseline state, e.g. F2L not solved),
 * "armed" (timer starts at the next move), "running", "finished".
 */
export class Attack {
  constructor(mode = MODES.PLL, facelets = SOLVED) {
    // Planned order of the cases, by attack title: the player can drag them
    // before the attack starts. Kept across restarts (the sandbox has no
    // storage, so it lasts until the plugin is closed).
    this.orders = {};
    this.restart(facelets, mode);
  }

  /** The planned order of the current attack's cases (the player can drag them). */
  get order() {
    return (this.orders[this.mode.title] ??= [...this.mode.names]);
  }

  set order(names) {
    this.orders[this.mode.title] = names;
  }

  /** Clear the attack and wait for the first move, from `facelets` (default: the current state). */
  restart(facelets = this.facelets, mode = this.mode) {
    this.mode = mode;
    this.facelets = facelets;
    this.results = []; // { name, caseTime, split } in solve order
    this.startTime = null;
    this.endTime = null;
    this.baseline = mode.isBaseline(facelets) ? facelets : null;
    this.last = null; // { from, time, result (null for a repeat), goesOn }: the last case, while its alg may still go on (see mergeMs)
  }

  get phase() {
    if (this.endTime !== null) return "finished";
    if (this.startTime !== null) return "running";
    return this.baseline ? "armed" : "waiting";
  }

  isDone(name) {
    return this.results.some((r) => r.name === name);
  }

  elapsed(now) {
    if (this.startTime === null) return 0;
    return (this.endTime ?? now) - this.startTime;
  }

  /** A move happened: starts the timer if the attack is armed. Returns true if it started. */
  start(now) {
    if (this.phase !== "armed") return false;
    this.startTime = now;
    return true;
  }

  /**
   * The cube reached a new state (acubemy's facelets after a move).
   * Returns an event: null, { type: "case", result }, { type: "repeat", name } or { type: "finish", result }.
   */
  update(facelets, now) {
    this.facelets = facelets;
    if (this.phase === "finished") return null;
    // A state in the middle of an alg changes nothing, even before the timer
    // starts: acubemy can send the state of a move before the move itself.
    if (!this.mode.isBaseline(facelets)) {
      // The first move off the last case: quick enough to be the same alg?
      if (this.last && !this.last.goesOn) {
        if (now - this.last.time <= this.mode.mergeMs) this.last.goesOn = true;
        else this.last = null;
      }
      return null;
    }

    let before = this.baseline;
    this.baseline = facelets;
    // Reached a baseline state from a broken one (e.g. cube was scrambled): arm only.
    if (!before || this.startTime === null) return null;

    // The alg that went on after the last case has ended here: it's now or never
    // for counting them as one case.
    const last = this.last?.goesOn ? this.last : null;
    if (last) this.last = null;

    let name = this.mode.identify(before, facelets);
    if (!name) return null; // only an AUF (or, for OLL, a PLL)

    if (last) {
      // Two cases (the last one and this one) or one (the whole alg)? Whichever
      // gets the earliest case of the planned order that is still to do.
      if (last.result) this.results.pop();
      const whole = this.mode.identify(last.from, facelets);
      const parts = [last.result?.name, name].filter((n) => n && !this.isDone(n));
      const rank = (n) => this.order.indexOf(n);
      if (whole && !this.isDone(whole) && (!parts.length || rank(whole) < Math.min(...parts.map(rank)))) {
        before = last.from;
        name = whole;
      } else if (last.result) this.results.push(last.result);
    }

    const split = now - this.startTime;
    const result = this.isDone(name) ? null : { name, caseTime: split - (this.results.at(-1)?.split ?? 0), split };
    this.last = this.mode.mergeMs ? { from: before, time: now, result, goesOn: false } : null;
    if (!result) return { type: "repeat", name };
    this.results.push(result);
    if (this.results.length === this.mode.names.length) {
      this.endTime = now;
      return { type: "finish", result };
    }
    return { type: "case", result };
  }
}

// acubemy resets the gyro or the cube state when the same U or D quarter turn
// is done four times in a row (U4, D4). The plugin restarts the attack on it.
const RESET_GESTURE_MS = 2000; // the four turns must be this quick

/** True when the last 4 of `moves` ({ move, time }) are U4 or D4 (all U, all U', all D or all D'). */
export function isResetGesture(moves) {
  const last = moves.slice(-4);
  return (
    last.length === 4 &&
    /^[UD]'?$/.test(last[0].move) &&
    last.every((m) => m.move === last[0].move) &&
    last[3].time - last[0].time <= RESET_GESTURE_MS
  );
}
