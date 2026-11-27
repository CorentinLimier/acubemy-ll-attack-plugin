import { SOLVED, STICKERS, algPermutation } from "./cube.js";
import { PLLS, toHostFrame } from "./pll.js";

// Top view of a PLL case as the player holds the cube (yellow on top, green
// in front): the yellow face and, around it, the top row of each side face.
// Arrows show where the alg moves each piece (two heads for a swap).

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
const YELLOW_FACE = LAST_LAYER.filter((s) => s.normal[1] === -1);

const center = ({ col, row }) => [OFFSETS[col] + SIZES[col] / 2, OFFSETS[row] + SIZES[row] / 2];

function arrow([x1, y1], [x2, y2], both) {
  // Shorten both ends so the heads sit inside the stickers.
  const len = Math.hypot(x2 - x1, y2 - y1);
  const k = 3 / len;
  const a = [x1 + (x2 - x1) * k, y1 + (y2 - y1) * k];
  const b = [x2 - (x2 - x1) * k, y2 - (y2 - y1) * k];
  return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" marker-end="url(#h)"${both ? ' marker-start="url(#h)"' : ""}/>`;
}

function render(perm) {
  // The case is the state the alg solves: sticker i shows what perm brings to it.
  const stickers = LAST_LAYER.map(({ i, cell }) => {
    const color = COLORS[SOLVED[perm[i]]];
    return `<rect x="${OFFSETS[cell.col]}" y="${OFFSETS[cell.row]}" width="${SIZES[cell.col]}" height="${SIZES[cell.row]}" rx="1.2" fill="${color}"/>`;
  });

  const cellByIndex = new Map(YELLOW_FACE.map((s) => [s.i, s.cell]));
  const arrows = [];
  for (const { i, cell } of YELLOW_FACE) {
    const to = perm[i];
    if (to === i) continue;
    const swap = perm[to] === i;
    if (swap && to < i) continue; // draw each swap once
    arrows.push(arrow(center(cell), center(cellByIndex.get(to)), swap));
  }

  return `<svg class="pll-diagram" viewBox="-1 -1 ${TOTAL + 2} ${TOTAL + 2}" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="h" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="2.6" markerHeight="2.6" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 z" fill="#1a1a1a"/></marker></defs>
<rect x="-1" y="-1" width="${TOTAL + 2}" height="${TOTAL + 2}" rx="2" fill="#0d0e11"/>
${stickers.join("")}
<g stroke="#1a1a1a" stroke-width="1.6" stroke-linecap="round">${arrows.join("")}</g>
</svg>`;
}

// Draw each case in the AUF orientation that moves the fewest pieces (the
// usual textbook picture); ties go to the fewest extra turns.
const AUF = [["", 0], ["D", 1], ["D'", 1], ["D2", 2]];
function canonical(alg) {
  let best = null;
  for (const [pre, preCost] of AUF) {
    for (const [post, postCost] of AUF) {
      const perm = algPermutation(`${pre} ${toHostFrame(alg)} ${post}`);
      const moved = YELLOW_FACE.filter(({ i }) => perm[i] !== i).length;
      const cost = moved * 10 + preCost + postCost;
      if (!best || cost < best.cost) best = { perm, cost };
    }
  }
  return best.perm;
}

/** SVG markup of each case, by name. */
export const PLL_DIAGRAMS = Object.fromEntries(PLLS.map(({ name, alg }) => [name, render(canonical(alg))]));
