# PLL & OLL Time Attack — acubemy plugin

Do all 21 PLLs or all 57 OLLs, in any order, on a smart cube. Each case is
recognised automatically and timed. Pick the attack with the **PLL / OLL** tabs
at the top: switching restarts, even in the middle of an attack.

The table on the right lists the cases still to do on top, each with a picture
(yellow face and the top row of the sides, as you hold the cube). Before the
attack starts you can drag them (⠿) into the order you plan to do them in
(each attack keeps its own order).
Done cases move below, without their picture, with the time of the case and the
running total; the first one done is at the bottom, so the full table fits on
screen at the end (for PLL). The order is kept until the plugin is closed
(plugins have no storage). Once all cases are done, click a column header
(PLL / OLL, Case, Total) to sort the results; click it again to reverse.

## How it works

- Hold the cube **yellow on top**. Start from a solved cube (or any state with F2L
  solved, and for PLL the yellow face too).
- The timer starts at your first move and stops when all the cases are done.
- The cube state comes from acubemy (`onStateChange` / `getFacelets()`). If it
  gets out of sync with your real cube, fix it in acubemy.
- Whenever F2L and the yellow face are solved again, the plugin compares the
  last layer with the previous such state and finds which PLL took it there
  (pre- and post-AUF, `y` rotations, wide and slice moves all work: only the
  result counts). Pure AUFs are ignored, and a case already done doesn't count.
- **OLL**: whenever F2L is solved again, the plugin works out from where each
  piece went which orientation the alg solves, whatever the state you started
  from, so you can chain OLLs without solving the last layer in between. A PLL
  or an AUF doesn't count. Some OLL algs solve F2L halfway (OLL 3 is OLL 44,
  U', OLL 45; OLL 41 and 42 start with a Sune): if the alg goes on within half
  a second, both parts count as one case. Pause longer between two algs.
- Each solved case is celebrated: its name and case time pop over the 3D cube
  with a burst of sparks, and its row flashes in the table. Finishing them all
  gets a bigger one. With "reduce motion" on, it's a plain fade.
- **Restart**: clears times and results. Doing U4 or D4 on the cube (the same
  U or D turn four times within 2 seconds, acubemy's reset gesture) restarts too.

## Files

| File | Purpose |
| --- | --- |
| `cube.js` | Facelet model of the cube (acubemy/Kociemba frame), F2L checks, piece tracking |
| `pll.js` | The 21 PLL cases (as last-layer patterns) and the PLL recognition |
| `oll.js` | The 57 OLL cases (which stickers are yellow) and the OLL recognition |
| `diagram.js` | Top-view picture of each case (top face + side stickers) |
| `attack.js` | The two attacks (`MODES`) and the state machine: timer, splits, results |
| `main.js`, `view.js`, `index.html`, `style.css` | UI, 3D cube (Three.js) |
| `tests/` | `npm test` (Node 20+); `tests/algs.mjs` has a known alg per case, used to check the patterns, and turns wide/slice moves and rotations into face turns |
| `eslint.config.js` | Lint rules (`npm run lint`): unused code, undefined names, `===`, `const` |
| `.github/workflows/ci.yml` | Runs the lint and the tests on every push |

## Develop

```sh
npm install      # dev tools only: ESLint
npm run lint
npm test
npx serve --cors .
```

Then open acubemy → **Games & Plugins → Developer mode** and enter `http://localhost:3000`.
Opened directly in a browser, you can play algs from the console (yellow on top):
`timeAttack.play("R U R' U' R' F R2 U' R' U' R U R' F'")`.

## License

MIT
