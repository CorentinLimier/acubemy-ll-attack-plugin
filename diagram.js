import { STICKERS } from "./cube.js";
import { PLL_NAMES, caseFacelets } from "./pll.js";

// Top view of a PLL case as the player holds the cube (yellow on top, green
// in front): the yellow face and, around it, the top row of each side face.

const COLORS = { U: "#ffffff", R: "#e8283c", F: "#1fb84f", D: "#ffd500", L: "#ff8a00", B: "#1e6bd6" };

const CELL = 10; // yellow face sticker
const STRIP = 4; // side sticker depth
const GAP = 1;
// Offsets of the 5 columns/rows: side strip, 3 yellow cells, side strip.
const OFFSETS = [0, STRIP + GAP, STRIP + CELL + 2 * GAP, STRIP + 2 * CELL + 3 * GAP, STRIP + 3 * CELL + 4 * GAP];
const SIZES = [STRIP, CELL, CELL, CELL, STRIP];
const TOTAL = 2 * STRIP + 3 * CELL + 4 * GAP;

// acubemy's frame has yellow on D; the player's frame is that turned by z2:
// x' = -x, z' = z. A sticker's grid cell is (position + normal) seen from above.
function cellOf({ pos, normal }) {
  const col = -pos[0] - normal[0] + 2;
  const row = pos[2] + normal[2] + 2;
  return { col, row };
}

const LAST_LAYER = STICKERS.map((s, i) => ({ ...s, i, cell: cellOf(s) })).filter((s) => s.pos[1] === -1 && s.normal[1] <= 0);

function render(facelets) {
  const stickers = LAST_LAYER.map(({ i, cell }) => {
    const color = COLORS[facelets[i]];
    return `<rect x="${OFFSETS[cell.col]}" y="${OFFSETS[cell.row]}" width="${SIZES[cell.col]}" height="${SIZES[cell.row]}" rx="1.2" fill="${color}"/>`;
  });

  return `<svg class="pll-diagram" viewBox="-1 -1 ${TOTAL + 2} ${TOTAL + 2}" xmlns="http://www.w3.org/2000/svg">
<rect x="-1" y="-1" width="${TOTAL + 2}" height="${TOTAL + 2}" rx="2" fill="#0d0e11"/>
${stickers.join("")}
</svg>`;
}

/** SVG markup of each case, by name. */
export const PLL_DIAGRAMS = Object.fromEntries(PLL_NAMES.map((name) => [name, render(caseFacelets(name))]));
