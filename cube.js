// Facelet-level 3x3 model in the acubemy/Kociemba frame:
// 54 stickers, faces in URFDLB order, 9 per face, row-major.
// Letters name the face whose centre colour the sticker has
// (U white, R red, F green, D yellow, L orange, B blue).
// Coordinates: +x = R, +y = U, +z = F (same frame as the SDK's gyro).

const FACES = "URFDLB";
export const SOLVED = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

/** Sticker colours by face letter, shared by the 3D cube and the case pictures. */
export const COLORS = { U: "#ffffff", R: "#e8283c", F: "#1fb84f", D: "#ffd500", L: "#ff8a00", B: "#1e6bd6" };

const NORMALS = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

// Position of sticker i (0..8) of a face, following the Kociemba net layout.
function stickerPosition(face, i) {
  const r = Math.floor(i / 3);
  const c = i % 3;
  switch (face) {
    case "U": return [c - 1, 1, r - 1];
    case "R": return [1, 1 - r, 1 - c];
    case "F": return [c - 1, 1 - r, 1];
    case "D": return [c - 1, -1, 1 - r];
    case "L": return [-1, 1 - r, c - 1];
    case "B": return [1 - c, 1 - r, -1];
  }
}

/** STICKERS[i] = { pos, normal } for facelet index i. */
export const STICKERS = [];
for (const face of FACES) {
  for (let i = 0; i < 9; i++) STICKERS.push({ pos: stickerPosition(face, i), normal: NORMALS[face] });
}

const key = (pos, normal) => pos.join() + "|" + normal.join();
const INDEX = new Map(STICKERS.map((s, i) => [key(s.pos, s.normal), i]));

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Rotate v by -90° about axis n: a clockwise quarter turn seen from outside the face n.
function rotateClockwise(v, n) {
  const c = cross(n, v);
  const d = dot(n, v);
  return [-c[0] + n[0] * d, -c[1] + n[1] * d, -c[2] + n[2] * d];
}

// A permutation p maps sticker index i to its destination p[i].
const IDENTITY = STICKERS.map((_, i) => i);

/** First p, then q. */
export function compose(p, q) {
  return p.map((dest) => q[dest]);
}

// The 18 face turns (U, U2, U', R, …), built once.
const MOVES = {};
for (const face of FACES) {
  const n = NORMALS[face];
  const quarter = STICKERS.map((s, i) =>
    dot(s.pos, n) === 1 ? INDEX.get(key(rotateClockwise(s.pos, n), rotateClockwise(s.normal, n))) : i
  );
  MOVES[face] = quarter;
  MOVES[face + "2"] = compose(quarter, quarter);
  MOVES[face + "'"] = compose(MOVES[face + "2"], quarter);
}

function movePermutation(token) {
  if (!MOVES[token]) throw new Error(`Unsupported move "${token}"`);
  return MOVES[token];
}

/** Permutation of a whole algorithm ("R U R' U'", face turns only). */
export function algPermutation(alg) {
  return alg
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((p, token) => compose(p, movePermutation(token)), IDENTITY);
}

export function inverse(p) {
  const out = new Array(p.length);
  p.forEach((dest, i) => (out[dest] = i));
  return out;
}

export function applyPermutation(facelets, p) {
  const out = new Array(54);
  for (let i = 0; i < 54; i++) out[p[i]] = facelets[i];
  return out.join("");
}

export function applyAlg(facelets, alg) {
  return applyPermutation(facelets, algPermutation(alg));
}

export function applyMove(facelets, move) {
  return applyPermutation(facelets, movePermutation(move));
}

// The 12 side stickers of the yellow (D) layer: the only stickers a PLL moves
// once F2L is solved and the yellow face is oriented. It's the bottom row of
// the B, L, F and R faces, which is the order the case patterns use (clockwise
// from above with yellow on top: back, right, front, left of the player).
export const LAST_LAYER_RING = [51, 52, 53, 42, 43, 44, 24, 25, 26, 15, 16, 17];
// The 9 yellow (D) stickers as the player sees them from above, row by row
// from the back-left (z2: the player's top-left-back is acubemy's D sticker 35).
export const LAST_LAYER_TOP = [35, 34, 33, 32, 31, 30, 29, 28, 27];

function solvedExcept(facelets, free) {
  for (let i = 0; i < 54; i++) {
    if (!free.has(i) && facelets[i] !== SOLVED[i]) return false;
  }
  return true;
}

const RING_SET = new Set(LAST_LAYER_RING);
const LAST_LAYER_SET = new Set([...LAST_LAYER_RING, ...LAST_LAYER_TOP]);

/** True when F2L (white side) is solved and the yellow face is all yellow: a PLL is left. */
export const isPllState = (facelets) => solvedExcept(facelets, RING_SET);

/** True when F2L (white side) is solved: only the yellow layer is left. */
export const isF2LState = (facelets) => solvedExcept(facelets, LAST_LAYER_SET);

// The player holds yellow on top, but in acubemy's frame yellow is D.
// A z2 rotation maps one to the other: U<->D, R<->L, F and B unchanged.
const Z2 = { U: "D", D: "U", R: "L", L: "R", F: "F", B: "B" };
export function toHostFrame(alg) {
  return alg.replace(/[URFDLB]/g, (f) => Z2[f]);
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
