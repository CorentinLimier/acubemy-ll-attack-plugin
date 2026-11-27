import { AUFS, LAST_LAYER_RING, algPermutation, applyPermutation, compose, patternFacelets, readPatterns, solvingPermutation } from "./cube.js";

// Each case as the player sees it from above, yellow on top and green in
// front: the top row of the four side faces, read clockwise: back (left to
// right), right (back to front), front (right to left), left (front to back).
// G green, O orange, B blue, R red. Solved is "BBB OOO GGG RRR".
// A case is a cube state, so it doesn't depend on the alg used to solve it.
export const PLL_CASES = readPatterns({
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
});

export const PLL_NAMES = Object.keys(PLL_CASES);

/** Pattern colour letter -> acubemy face letter. */
export const COLOUR_TO_FACE = { G: "F", O: "L", B: "B", R: "R" };

/** acubemy facelets of a case: solved cube with the case's last layer. */
export const caseFacelets = (name) => patternFacelets(PLL_CASES[name], LAST_LAYER_RING, (c) => COLOUR_TO_FACE[c]);

const AUF = AUFS.map(algPermutation);

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
