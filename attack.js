import { SOLVED, isF2LState, isPllState } from "./cube.js";
import { PLL_NAMES, identifyPll } from "./pll.js";
import { OLL_NAMES, identifyOll } from "./oll.js";

/**
 * What each attack drills: its cases, the states it starts each case from
 * (`isBaseline`) and how it tells which case took one such state to the next.
 * `mergeMs`: some OLL algs are two shorter OLL algs in a row (OLL 18 is OLL 7,
 * U2, OLL 8), so F2L is solved in the middle of them. When the alg goes on
 * within `mergeMs` of such a state, it is either two cases or one: the plugin
 * picks the one that gets the earliest case of the planned order still to do.
 */
export const MODES = {
  PLL: { title: "PLL", names: PLL_NAMES, isBaseline: isPllState, identify: identifyPll, baseline: "F2L and the yellow face" },
  OLL: { title: "OLL", names: OLL_NAMES, isBaseline: isF2LState, identify: identifyOll, baseline: "F2L", mergeMs: 500 },
};

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
    this.orders = {}; // planned order of the cases, by attack: kept across restarts
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
    this.last = null; // the last case seen, while the alg may still go on (see mergeMs)
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

    let name = this.mode.identify(before, facelets);
    if (!name) return null; // only an AUF (or, for OLL, a PLL)

    const last = this.last;
    if (last?.goesOn) {
      // Two cases (the last one and this one) or one (the whole alg)?
      const whole = this.mode.identify(last.from, facelets);
      const counted = last.counted ? this.results.at(-1) : null;
      const toDo = (n) => !this.results.some((r) => r.name === n && r !== counted);
      const rank = (n) => this.order.indexOf(n);
      const parts = [counted?.name, name].filter((n) => n && toDo(n));
      if (whole && toDo(whole) && (!parts.length || rank(whole) < Math.min(...parts.map(rank)))) {
        if (counted) this.results.pop();
        before = last.from;
        name = whole;
      }
    }
    const repeat = this.isDone(name);
    this.last = this.mode.mergeMs ? { from: before, time: now, counted: !repeat, goesOn: false } : null;
    if (repeat) return { type: "repeat", name };

    const previous = this.results.length ? this.results[this.results.length - 1].split : 0;
    const split = now - this.startTime;
    const result = { name, caseTime: split - previous, split };
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
