// Facelet-level 3x3 model in the acubemy/Kociemba frame:
// 54 stickers, faces in URFDLB order, 9 per face, row-major.
// Letters name the face whose centre colour the sticker has
// (U white, R red, F green, D yellow, L orange, B blue).
// Coordinates: +x = R, +y = U, +z = F (same frame as the SDK's gyro).

export const FACES = "URFDLB";
export const SOLVED = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

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

/** STICKERS[i] = { face, pos, normal } for facelet index i. */
export const STICKERS = [];
for (const face of FACES) {
  for (let i = 0; i < 9; i++) STICKERS.push({ face, pos: stickerPosition(face, i), normal: NORMALS[face] });
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

const QUARTER = {};
for (const face of FACES) {
  const n = NORMALS[face];
  QUARTER[face] = STICKERS.map((s, i) =>
    dot(s.pos, n) === 1 ? INDEX.get(key(rotateClockwise(s.pos, n), rotateClockwise(s.normal, n))) : i
  );
}

/** First p, then q. */
export function compose(p, q) {
  return p.map((dest) => q[dest]);
}

function parseMove(token) {
  const m = /^([URFDLB])(2'?|'?)$/.exec(token);
  if (!m) throw new Error(`Unsupported move "${token}"`);
  const turns = m[2] === "" ? 1 : m[2] === "'" ? 3 : 2;
  return { face: m[1], turns };
}

function movePermutation(token) {
  const { face, turns } = parseMove(token);
  let p = IDENTITY;
  for (let i = 0; i < turns; i++) p = compose(p, QUARTER[face]);
  return p;
}

const MOVE_CACHE = new Map();
function cachedMove(token) {
  if (!MOVE_CACHE.has(token)) MOVE_CACHE.set(token, movePermutation(token));
  return MOVE_CACHE.get(token);
}

/** Permutation of a whole algorithm ("R U R' U'", face turns only). */
export function algPermutation(alg) {
  return alg
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((p, token) => compose(p, cachedMove(token)), IDENTITY);
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
  return applyPermutation(facelets, cachedMove(move));
}

// The 12 side stickers of the yellow (D) layer: the only stickers a PLL moves
// once F2L is solved and the yellow face is oriented.
const LL_SIDE = new Set(
  STICKERS.map((s, i) => (s.pos[1] === -1 && s.normal[1] === 0 ? i : -1)).filter((i) => i >= 0)
);

/** True when F2L (white side) is solved and the yellow face is all yellow. */
export function isPllState(facelets) {
  for (let i = 0; i < 54; i++) {
    if (!LL_SIDE.has(i) && facelets[i] !== FACES[Math.floor(i / 9)]) return false;
  }
  return true;
}

export function isValidFacelets(facelets) {
  if (typeof facelets !== "string" || facelets.length !== 54) return false;
  for (const f of FACES) if (facelets.split(f).length - 1 !== 9) return false;
  return true;
}
