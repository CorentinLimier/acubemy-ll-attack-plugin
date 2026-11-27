# PLL Time Attack — acubemy plugin

Do all 21 PLLs, in any order, on a smart cube. Each PLL is recognised automatically
and timed.

The table on the right lists the cases still to do on top, each with a picture
(yellow face and the top row of the sides, as you hold the cube). Before the
attack starts you can drag them (⠿) into the order you plan to do them in.
Done cases move below, without their picture, with the time of the case and the
running total; the first one done is at the bottom, so the full table fits on
screen at the end. The order is kept until the plugin is closed (plugins have
no storage).

## How it works

- Hold the cube **yellow on top**. Start from a solved cube (or any state with F2L
  and the yellow face solved).
- The timer starts at your first move and stops when all 21 PLLs are done.
- The cube state comes from acubemy (`onStateChange` / `getFacelets()`). If it
  gets out of sync with your real cube, fix it in acubemy.
- Whenever F2L and the yellow face are solved again, the plugin compares the
  last layer with the previous such state and finds which PLL took it there
  (pre- and post-AUF, `y` rotations, wide and slice moves all work: only the
  result counts). Pure AUFs are ignored, and a case already done doesn't count.
- **Reset gyro**: hold the cube white on top, green in front, then click.
- **Restart PLL attack**: clears times and results.

## Files

| File | Purpose |
| --- | --- |
| `cube.js` | Facelet model of the cube (acubemy/Kociemba frame) |
| `pll.js` | The 21 cases (as last-layer patterns) and the PLL recognition |
| `diagram.js` | Top-view picture of each case (yellow face + side stickers) |
| `attack.js` | Attack state machine: timer, splits, results |
| `main.js`, `view.js`, `index.html`, `style.css` | UI, 3D cube (Three.js) |
| `tests/` | `npm test` (Node 20+); `tests/algs.mjs` has a known alg per case, used to check the patterns |
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
`pllAttack.play("R U R' U' R' F R2 U' R' U' R U R' F'")`.

## License

MIT
