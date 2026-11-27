import { SOLVED, isPllState } from "./cube.js";
import { PLL_NAMES, identifyPll } from "./pll.js";

/**
 * PLL attack state machine. Feed it the cube's facelets after every move
 * (update) and the time of each move (start); it detects each PLL and keeps
 * the splits.
 *
 * Phases: "waiting" (cube not in a PLL state: F2L + yellow face must be solved),
 * "armed" (timer starts at the next move), "running", "finished".
 */
export class PllAttack {
  constructor(facelets = SOLVED) {
    this.restart(facelets);
  }

  /** Clear the attack and wait for the first move, from `facelets` (default: the current state). */
  restart(facelets = this.facelets) {
    this.facelets = facelets;
    this.results = []; // { name, caseTime, split } in solve order
    this.startTime = null;
    this.endTime = null;
    this.baseline = isPllState(this.facelets) ? this.facelets : null;
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
   * Returns an event: null, { type: "pll", result }, { type: "repeat", name } or { type: "finish", result }.
   */
  update(facelets, now) {
    this.facelets = facelets;
    // A state in the middle of an alg changes nothing, even before the timer
    // starts: acubemy can send the state of a move before the move itself.
    if (this.phase === "finished" || !isPllState(facelets)) return null;

    const before = this.baseline;
    this.baseline = facelets;
    // Reached a PLL state from a broken one (e.g. cube was scrambled): arm only.
    if (!before || this.startTime === null) return null;

    const name = identifyPll(before, facelets);
    if (!name) return null; // only an AUF
    if (this.isDone(name)) return { type: "repeat", name };

    const last = this.results.length ? this.results[this.results.length - 1].split : 0;
    const split = now - this.startTime;
    const result = { name, caseTime: split - last, split };
    this.results.push(result);
    if (this.results.length === PLL_NAMES.length) {
      this.endTime = now;
      return { type: "finish", result };
    }
    return { type: "pll", result };
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
