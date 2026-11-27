import { LAST_LAYER_RING, SOLVED, STICKERS, algPermutation, applyPermutation, compose } from "./cube.js";

// Each case as the player sees it from above, yellow on top and green in
// front: the top row of the four side faces, read clockwise: back (left to
// right), right (back to front), front (right to left), left (front to back).
// G green, O orange, B blue, R red. Solved is "BBB OOO GGG RRR".
// A case is a cube state, so it doesn't depend on the alg used to solve it.
export const PLL_CASES = {
  Aa: "OBO GOR BGG RRB",
  Ab: "GBR BOB OGG RRO",
  E: "RBO GOB OGR BRG",
  F: "BGO GOB OBG RRR",
  Ga: "BGO GRB OOG RBR",
  Gb: "BRO GGB OBG ROR",
  Gc: "BOO GRB OBG RGR",
  Gd: "BGO GBB ORG ROR",
  H: "BGB ORO GBG ROR",
  Ja: "RBB OOO GRR BGG",
  Jb: "BBO GGB OOG RRR",
  Na: "BBG RRO GGB OOR",
  Nb: "GBB ORR BGG ROO",
  Ra: "BRO GOB OGG RBR",
  Rb: "BBO GOB ORG RGR",
  T: "BBO GRB OGG ROR",
  Ua: "BBB ORO GOG RGR",
  Ub: "BBB OGO GRG ROR",
  V: "GOB OBR BGG RRO",
  Y: "GRB OOR BGG RBO",
  Z: "BOB OBO GRG RGR",
};

export const PLL_NAMES = Object.keys(PLL_CASES);

// The player holds yellow on top, but in acubemy's frame yellow is D.
// A z2 rotation maps one to the other: U<->D, R<->L, F and B unchanged.
const Z2 = { U: "D", D: "U", R: "L", L: "R", F: "F", B: "B" };
export function toHostFrame(alg) {
  return alg.replace(/[URFDLB]/g, (f) => Z2[f]);
}

/** Pattern colour letter -> acubemy face letter. */
export const COLOUR_TO_FACE = { G: "F", O: "L", B: "B", R: "R" };

/** acubemy facelets of a case: solved cube with the case's last layer. */
export function caseFacelets(name) {
  const colours = PLL_CASES[name].replace(/ /g, "");
  const out = SOLVED.split("");
  LAST_LAYER_RING.forEach((index, k) => (out[index] = COLOUR_TO_FACE[colours[k]]));
  return out.join("");
}

// Stickers grouped by cubie, to recognise pieces by their colours.
const CUBIES = new Map();
STICKERS.forEach((s, i) => {
  const key = s.pos.join();
  if (!CUBIES.has(key)) CUBIES.set(key, []);
  CUBIES.get(key).push(i);
});
const pieceKey = (facelets, indices) => indices.map((i) => facelets[i]).sort().join("");
const HOME = new Map([...CUBIES.values()].map((indices) => [pieceKey(SOLVED, indices), indices]));

/** Sticker permutation that takes `state` to the solved cube (any alg for that case does this). */
export function solvingPermutation(state) {
  const perm = STICKERS.map((_, i) => i);
  const seen = new Set();
  for (const indices of CUBIES.values()) {
    const key = pieceKey(state, indices);
    if (!HOME.has(key) || seen.has(key)) throw new Error("Invalid cube state");
    seen.add(key);
    const home = HOME.get(key);
    for (const i of indices) perm[i] = home.find((j) => SOLVED[j] === state[i]);
  }
  return perm;
}

const AUF = ["", "D", "D2", "D'"].map((a) => algPermutation(a)); // the player's U turns

const CASE_PERMUTATIONS = PLL_NAMES.map((name) => {
  const solve = solvingPermutation(caseFacelets(name));
  const perms = [];
  for (const pre of AUF) for (const post of AUF) perms.push(compose(compose(pre, solve), post));
  return { name, perms };
});

/**
 * Which PLL takes PLL state `before` to PLL state `after`?
 * Returns a case name, or null when only the yellow layer was turned (AUF).
 */
export function identifyPll(before, after) {
  for (const { name, perms } of CASE_PERMUTATIONS) {
    if (perms.some((p) => applyPermutation(before, p) === after)) return name;
  }
  return null;
}
