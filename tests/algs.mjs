// Known algs for each case, used by the tests to check the case patterns in
// pll.js and to play realistic attacks. Yellow on top, face turns only (the
// cube model has no rotations, wide or slice moves). Any other alg for a case
// is detected the same way: detection only compares cube states.
export const ALGS = [
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
