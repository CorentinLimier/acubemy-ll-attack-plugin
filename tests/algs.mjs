// Known algs for each case, used by the tests to check the case patterns in
// pll.js and oll.js and to play realistic attacks. Yellow on top. Any other
// alg for a case is detected the same way: detection only compares cube states.

// A smart cube only sees face turns: a wide move turns the opposite face and
// moves the centres, a slice move turns both outer faces, and after either
// (or a rotation) the player's faces are other faces of the cube.
const ROTATIONS = {
  x: { U: "F", F: "D", D: "B", B: "U" }, // the new U is the old F...
  y: { F: "R", R: "B", B: "L", L: "F" },
  z: { U: "L", L: "D", D: "R", R: "U" },
};
// Move -> [face turns (in the player's current frame), rotation it adds].
const WIDE = {
  r: ["L", "x"], l: ["R", "x'"], u: ["D", "y"], d: ["U", "y'"], f: ["B", "z"], b: ["F", "z'"],
  M: ["R L'", "x'"], E: ["U D'", "y'"], S: ["F' B", "z"],
};
const times = (suffix) => ({ "": 1, 2: 2, "'": 3 })[suffix];
const suffixOf = (n) => ["", "", "2", "'"][n % 4];
const turns = (token) => times(token.slice(1));

/** Face turns of `alg` as the cube sees them (still in the player's frame, yellow on top). */
export function faceTurns(alg) {
  let frame = { U: "U", R: "R", F: "F", D: "D", L: "L", B: "B" }; // player's face -> cube face
  const out = [];
  const turn = (token, n) => out.push(frame[token[0]] + suffixOf(n * times(token.slice(1) || "")));
  const rotate = (token, n) => {
    for (let k = 0; k < n * turns(token); k++) {
      const map = ROTATIONS[token[0]];
      frame = Object.fromEntries(Object.entries(frame).map(([face, cube]) => [face, map[face] ? frame[map[face]] : cube]));
    }
  };
  for (const token of alg.trim().split(/\s+/)) {
    if (ROTATIONS[token[0]]) rotate(token, 1);
    else if (WIDE[token[0]]) {
      const [faces, rotation] = WIDE[token[0]];
      const n = turns(token);
      for (const f of faces.split(" ")) turn(f, n);
      rotate(rotation, n);
    } else turn(token, 1);
  }
  return out.join(" ");
}

/** The inverse of a face-turn alg. */
export const invert = (alg) => alg.trim().split(/\s+/).reverse().map((m) => m[0] + suffixOf(4 - times(m.slice(1)))).join(" ");

export const PLL_ALGS = [
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

// OLL algs, by case number.
export const OLL_ALGS = [
  "R U2 R2 F R F' U2 R' F R F'",
  "F R U R' U' F' f R U R' U' f'",
  "f R U R' U' f' U' F R U R' U' F'",
  "f R U R' U' f' U F R U R' U' F'",
  "r' U2 R U R' U r",
  "r U2 R' U' R U' r'",
  "r U R' U R U2 r'",
  "l' U' L U' L' U2 l",
  "R U R' U' R' F R2 U R' U' F'",
  "R U R' U R' F R F' R U2 R'",
  "r U R' U R' F R F' R U2 r'",
  "M' R' U' R U' R' U2 R U' M",
  "F U R U' R2 F' R U R U' R'",
  "R' F R U R' F' R F U' F'",
  "r' U' r R' U' R U r' U r",
  "r U r' R U R' U' r U' r'",
  "R U R' U R' F R F' U2 R' F R F'",
  "r U R' U R U2 r2 U' R U' R' U2 r",
  "M U R U R' U' M' R' F R F'",
  "r U R' U' M2 U R U' R' U' M'",
  "R U2 R' U' R U R' U' R U' R'",
  "R U2 R2 U' R2 U' R2 U2 R",
  "R2 D' R U2 R' D R U2 R",
  "r U R' U' r' F R F'",
  "F' r U R' U' r' F R",
  "R U2 R' U' R U' R'",
  "R U R' U R U2 R'",
  "r U R' U' r' R U R U' R'",
  "R U R' U' R U' R' F' U' F R U R'",
  "F R' F R2 U' R' U' R U R' F2",
  "R' U' F U R U' R' F' R",
  "L U F' U' L' U L F L'",
  "R U R' U' R' F R F'",
  "R U R2 U' R' F R U R U' F'",
  "R U2 R2 F R F' R U2 R'",
  "L' U' L U' L' U L U L F' L' F",
  "F R' F' R U R U' R'",
  "R U R' U R U' R' U' R' F R F'",
  "L F' L' U' L U F U' L'",
  "R' F R U R' U' F' U R",
  "R U R' U R U2 R' F R U R' U' F'",
  "R' U' R U' R' U2 R F R U R' U' F'",
  "F' U' L' U L F",
  "F U R U' R' F'",
  "F R U R' U' F'",
  "R' U' R' F R F' U R",
  "R' U' R' F R F' R' F R F' U R",
  "F R U R' U' R U R' U' F'",
  "r U' r2 U r2 U r2 U' r",
  "r' U r2 U' r2 U' r2 U r'",
  "F U R U' R' U R U' R' F'",
  "R U R' U R U' B U' B' R'",
  "l' U2 L U L' U' L U L' U l",
  "r U2 R' U' R U R' U' R U' r'",
  "R' F R U R U' R2 F' R2 U' R' U R U R'",
  "r U r' U R U' R' U R U' R' r U' r'",
  "R U R' U' M' U R U' r'",
].map((alg, i) => ({ name: String(i + 1), alg }));

/** The known alg of a case, PLL or OLL, by name ("T", "27"). */
export const alg = (name) => [...PLL_ALGS, ...OLL_ALGS].find((a) => a.name === name).alg;
