import { AUFS, LAST_LAYER_RING, LAST_LAYER_TOP, SOLVED, applyAlg, applyPermutation, compose, inverse, patternFacelets, readPatterns, solvingPermutation } from "./cube.js";

// Each case as the player sees it from above, yellow on top and green in
// front: which last-layer stickers are yellow (x) or not (.). First the 3 rows
// of the top face (back row first, left to right), then the side stickers in
// the order of the PLL patterns: back (left to right), right (back to front),
// front (right to left), left (front to back).
// A case is an orientation of the last layer, so it doesn't depend on the alg.
export const OLL_CASES = readPatterns({
  1: "... .x. ... .x. xxx .x. xxx",
  2: "... .x. ... .xx .x. xx. xxx",
  3: "... .x. ..x xx. xx. .x. xx.",
  4: "..x .x. ... .x. .xx .xx .xx",
  5: "... .xx .xx xx. x.. ... xx.",
  6: ".xx .xx ... ... ..x .xx .xx",
  7: ".x. xx. x.. x.. xx. xx. ...",
  8: ".x. .xx ..x ..x ... .xx .xx",
  9: ".x. xx. ..x ..x .x. .xx ..x",
  10: "..x xx. .x. xx. .x. x.. x..",
  11: ".xx xx. ... x.. .x. xx. x..",
  12: "xx. .xx ... ..x ..x .xx .x.",
  13: "... xxx x.. xx. x.. xx. ...",
  14: "... xxx ..x .xx ... .xx ..x",
  15: "... xxx ..x xx. x.. .x. x..",
  16: "..x xxx ... .x. ..x .xx ..x",
  17: "x.. .x. ..x .xx .x. .x. xx.",
  18: "x.x .x. ... .x. .x. xxx .x.",
  19: "x.x .x. ... .x. .xx .x. xx.",
  20: "x.x .x. x.x .x. .x. .x. .x.",
  21: ".x. xxx .x. x.x ... x.x ...",
  22: ".x. xxx .x. ..x ... x.. x.x",
  23: ".x. xxx xxx x.x ... ... ...",
  24: ".xx xxx .xx x.. ... ..x ...",
  25: ".xx xxx xx. ... ... x.. ..x",
  26: ".xx xxx .x. ... ..x ..x ..x",
  27: ".x. xxx xx. x.. x.. x.. ...",
  28: "xxx xx. x.x ... .x. .x. ...",
  29: ".xx xx. ..x x.. .x. .xx ...",
  30: ".x. xx. x.x ... xx. .x. ..x",
  31: ".xx .xx ..x x.. ... .xx .x.",
  32: "xx. xx. x.. ..x .x. xx. ...",
  33: "..x xxx ..x xx. ... .xx ...",
  34: "... xxx x.x .x. x.. .x. ..x",
  35: "x.. .xx .xx .x. x.. ..x .x.",
  36: "xx. .xx ..x ..x ... .x. xx.",
  37: "xx. xx. ..x ... xx. .xx ...",
  38: ".xx xx. x.. x.. .xx .x. ...",
  39: "..x xxx x.. xx. ..x .x. ...",
  40: "x.. xxx ..x .xx ... .x. x..",
  41: ".x. xx. x.x x.x .x. .x. ...",
  42: "x.x xx. .x. .x. .x. x.x ...",
  43: ".xx .xx ..x ... ... .x. xxx",
  44: "xx. xx. x.. ... xxx .x. ...",
  45: "..x xxx ..x .x. ... .x. x.x",
  46: "xx. .x. xx. ... xxx ... .x.",
  47: ".x. .xx ... x.. x.x .xx .x.",
  48: ".x. xx. ... ..x .x. xx. x.x",
  49: ".x. .xx ... ..x ... xx. xxx",
  50: "... .xx .x. .xx ... x.. xxx",
  51: "... xxx ... xx. x.x .xx ...",
  52: ".x. .x. .x. x.. xxx ..x .x.",
  53: ".x. .xx ... x.x ... xxx .x.",
  54: ".x. xx. ... x.x .x. xxx ...",
  55: "... xxx ... xxx ... xxx ...",
  56: "... xxx ... .x. x.x .x. x.x",
  57: "x.x xxx x.x .x. ... .x. ...",
});

export const OLL_NAMES = Object.keys(OLL_CASES);

const MASK_STICKERS = [...LAST_LAYER_TOP, ...LAST_LAYER_RING];
/** The yellow stickers of a state's last layer, in the order of the case patterns. */
export const yellowMask = (facelets) => MASK_STICKERS.map((i) => (facelets[i] === "D" ? "x" : ".")).join("");

// Each case in the 4 ways it can be held (pre-AUF), by yellow mask.
const CASE_BY_MASK = new Map();
for (const name of OLL_NAMES) {
  const facelets = patternFacelets(OLL_CASES[name], MASK_STICKERS, (c) => (c === "x" ? "D" : "-"));
  for (const auf of AUFS) CASE_BY_MASK.set(yellowMask(applyAlg(facelets, auf)), name);
}

/**
 * Which OLL takes F2L state `before` to F2L state `after`? The alg is known from
 * where each piece went, whatever the starting state; the case is the state it
 * solves. Returns a case name, or null when the orientation didn't change
 * (an AUF or a PLL).
 */
export function identifyOll(before, after) {
  const solvedByAlg = applyPermutation(SOLVED, compose(solvingPermutation(after), inverse(solvingPermutation(before))));
  return CASE_BY_MASK.get(yellowMask(solvedByAlg)) ?? null;
}
