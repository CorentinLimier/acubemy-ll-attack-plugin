import { COLORS } from "./cube.js";
import { COLOUR_TO_FACE, PLL_CASES } from "./pll.js";

// Top view of a PLL case as the player holds the cube (yellow on top, green
// in front): the yellow face and, around it, the top row of each side face,
// drawn straight from the case's pattern in pll.js.


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
const YELLOW_CELLS = [1, 2, 3].flatMap((row) => [1, 2, 3].map((col) => [col, row]));

const rect = ([col, row], face) =>
  `<rect x="${OFFSETS[col]}" y="${OFFSETS[row]}" width="${SIZES[col]}" height="${SIZES[row]}" rx="1.2" fill="${COLORS[face]}"/>`;

function render(pattern) {
  const colours = pattern.replace(/ /g, "");
  const stickers = [...YELLOW_CELLS.map((cell) => rect(cell, "D")), ...RING_CELLS.map((cell, k) => rect(cell, COLOUR_TO_FACE[colours[k]]))];
  return `<svg class="pll-diagram" viewBox="-1 -1 ${TOTAL + 2} ${TOTAL + 2}" xmlns="http://www.w3.org/2000/svg">
<rect x="-1" y="-1" width="${TOTAL + 2}" height="${TOTAL + 2}" rx="2" fill="#0d0e11"/>
${stickers.join("")}
</svg>`;
}

/** SVG markup of each case, by name. */
export const PLL_DIAGRAMS = Object.fromEntries(Object.entries(PLL_CASES).map(([name, pattern]) => [name, render(pattern)]));
