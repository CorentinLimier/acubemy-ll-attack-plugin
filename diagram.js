import { COLORS } from "./cube.js";
import { COLOUR_TO_FACE, PLL_CASES } from "./pll.js";
import { OLL_CASES } from "./oll.js";

// Top view of a case as the player holds the cube (yellow on top, green in
// front): the top face and, around it, the top row of each side face, drawn
// straight from the case's pattern in pll.js or oll.js.

const CELL = 10; // yellow face sticker
const STRIP = 4; // side sticker depth
const GAP = 1;
// Offsets of the 5 columns/rows: side strip, 3 yellow cells, side strip.
const OFFSETS = [0, STRIP + GAP, STRIP + CELL + 2 * GAP, STRIP + 2 * CELL + 3 * GAP, STRIP + 3 * CELL + 4 * GAP];
const SIZES = [STRIP, CELL, CELL, CELL, STRIP];
const TOTAL = 2 * STRIP + 3 * CELL + 4 * GAP;

// Grid cells [col, row] of the 12 side stickers, in pattern order (clockwise
// from the back-left): back left to right, right back to front, front right
// to left, left front to back.
const RING_CELLS = [
  [1, 0], [2, 0], [3, 0],
  [4, 1], [4, 2], [4, 3],
  [3, 4], [2, 4], [1, 4],
  [0, 3], [0, 2], [0, 1],
];
const TOP_CELLS = [1, 2, 3].flatMap((row) => [1, 2, 3].map((col) => [col, row]));

const CELLS = [...TOP_CELLS, ...RING_CELLS];

const rect = ([col, row], fill) =>
  `<rect x="${OFFSETS[col]}" y="${OFFSETS[row]}" width="${SIZES[col]}" height="${SIZES[row]}" rx="1.2" fill="${fill}"/>`;

/** `fills`: a colour for each top cell (row by row), then each side sticker (in pattern order). */
function render(fills) {
  const stickers = CELLS.map((cell, k) => rect(cell, fills[k]));
  return `<svg class="case-diagram" viewBox="-1 -1 ${TOTAL + 2} ${TOTAL + 2}" xmlns="http://www.w3.org/2000/svg">
<rect x="-1" y="-1" width="${TOTAL + 2}" height="${TOTAL + 2}" rx="2" fill="#0d0e11"/>
${stickers.join("")}
</svg>`;
}

const pictures = (cases, fills) =>
  Object.fromEntries(Object.entries(cases).map(([name, pattern]) => [name, render(fills([...pattern.replace(/ /g, "")]))]));

// PLL: the yellow face, and the side colours.
const pll = (ring) => [...TOP_CELLS.map(() => COLORS.D), ...ring.map((c) => COLORS[COLOUR_TO_FACE[c]])];
// OLL: only which stickers are yellow; the others are grey.
const NOT_YELLOW = "#4a4e58";
const oll = (mask) => mask.map((c) => (c === "x" ? COLORS.D : NOT_YELLOW));

/** SVG markup of each case, by attack (as in MODES) and case name. */
export const DIAGRAMS = { PLL: pictures(PLL_CASES, pll), OLL: pictures(OLL_CASES, oll) };
