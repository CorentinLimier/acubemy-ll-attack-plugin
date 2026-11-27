import { algPermutation, applyPermutation } from "./cube.js";

// Reference algorithms, written the usual way (yellow on top), face turns only.
// They are only used to tell the 21 cases apart: any alg the player uses for a
// case gives the same result up to pre/post AUF, so detection works whatever
// algs, rotations, wide or slice moves the player actually does.
export const PLLS = [
  { name: "Aa", alg: "R' F R' B2 R F' R' B2 R2" },
  { name: "Ab", alg: "R2 B2 R F R' B2 R F' R" },
  { name: "E", alg: "R B' R' F R B R' F' R B R' F R B' R' F'" },
  { name: "F", alg: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
  { name: "Ga", alg: "R2 U R' U R' U' R U' R2 U' D R' U R D'" },
  { name: "Gb", alg: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
  { name: "Gc", alg: "R2 U' R U' R U R' U R2 U D' R U' R' D" },
  { name: "Gd", alg: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },
  { name: "H", alg: "R2 U2 R U2 R2 U2 R2 U2 R U2 R2" },
  { name: "Ja", alg: "L' U' L F L' U' L U L F' L2 U L" },
  { name: "Jb", alg: "R U R' F' R U R' U' R' F R2 U' R'" },
  { name: "Na", alg: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'" },
  { name: "Nb", alg: "R' U R U' R' F' U' F R U R' F R' F' R U' R" },
  { name: "Ra", alg: "R U' R' U' R U R D R' U' R D' R' U2 R'" },
  { name: "Rb", alg: "R2 F R U R U' R' F' R U2 R' U2 R" },
  { name: "T", alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
  { name: "Ua", alg: "R U' R U R U R U' R' U' R2" },
  { name: "Ub", alg: "R2 U R U R' U' R' U' R' U R'" },
  { name: "V", alg: "R' U R' U' B' R' B2 U' B' U B' R B R" },
  { name: "Y", alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  { name: "Z", alg: "R' U' R U' R U R U' R' U R U R2 U' R' U" },
];

export const PLL_NAMES = PLLS.map((p) => p.name);

// The player holds yellow on top, but in acubemy's frame yellow is D.
// A z2 rotation maps one to the other: U<->D, R<->L, F and B unchanged.
const Z2 = { U: "D", D: "U", R: "L", L: "R", F: "F", B: "B" };
export function toHostFrame(alg) {
  return alg.replace(/[URFDLB]/g, (f) => Z2[f]);
}

const AUF = ["", "D", "D2", "D'"]; // the player's U turns, in acubemy's frame

const IDENTITY_CLASS = AUF.map((a) => algPermutation(a));

const CASE_PERMUTATIONS = PLLS.map(({ name, alg }) => {
  const host = toHostFrame(alg);
  const perms = [];
  for (const pre of AUF) for (const post of AUF) perms.push(algPermutation(`${pre} ${host} ${post}`));
  return { name, perms };
});

/**
 * Which PLL alg takes PLL state `before` to PLL state `after`?
 * Returns a case name, "AUF" when only the yellow layer was turned, or null
 * when nothing matches (should not happen between two PLL states).
 */
export function identifyPll(before, after) {
  if (IDENTITY_CLASS.some((p) => applyPermutation(before, p) === after)) return "AUF";
  for (const { name, perms } of CASE_PERMUTATIONS) {
    if (perms.some((p) => applyPermutation(before, p) === after)) return name;
  }
  return null;
}
