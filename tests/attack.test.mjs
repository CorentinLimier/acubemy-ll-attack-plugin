import { test } from "node:test";
import assert from "node:assert/strict";
import { SOLVED, applyAlg, applyMove, toHostFrame } from "../cube.js";
import { OLL_ALGS, PLL_ALGS as ALGS, alg, faceTurns } from "./algs.mjs";
import { Attack, MODES, isResetGesture } from "../attack.js";

// What acubemy sends: quarter turns only, so "R2" arrives as "R R".
function quarterTurns(alg) {
  return alg.trim().split(/\s+/).flatMap((m) => (m.endsWith("2") ? [m[0], m[0]] : [m]));
}

// Shuffled the same way on every run (Fisher-Yates with a Park-Miller
// generator, seed > 0), so a failure can be replayed.
function shuffle(list, seed) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// What the plugin does for each move: start() on the move, update() with the new state.
function step(attack, move, now) {
  attack.start(now);
  return attack.update(applyMove(attack.facelets, move), now);
}

function play(attack, alg, clock, gap = 100) {
  const events = [];
  for (const m of quarterTurns(toHostFrame(faceTurns(alg)))) {
    clock.t += gap;
    const e = step(attack, m, clock.t);
    if (e) events.push(e);
  }
  return events;
}

test("full attack in a shuffled order with AUFs, a repeat and an extra AUF", () => {
  const attack = new Attack(MODES.PLL, SOLVED);
  assert.equal(attack.phase, "armed");
  const clock = { t: 1000 };
  const order = shuffle(ALGS, 1);
  const aufs = ["", "U", "U2", "U'"];

  const first = play(attack, `U ${order[0].alg}`, clock);
  assert.equal(attack.startTime, 1100);
  assert.deepEqual(first.map((e) => e.result.name), [order[0].name]);

  // Repeating a done case does not count.
  const repeat = play(attack, order[0].alg, clock);
  assert.deepEqual(repeat, [{ type: "repeat", name: order[0].name }]);

  for (let i = 1; i < order.length; i++) {
    const auf = aufs[i % 4];
    const ev = play(attack, `${auf} ${order[i].alg} ${aufs[(i + 1) % 4]}`, clock);
    assert.equal(ev.length, 1, `${order[i].name}: ${JSON.stringify(ev)}`);
    assert.equal(ev[0].result.name, order[i].name);
    assert.equal(ev[0].type, i === order.length - 1 ? "finish" : "case");
  }

  assert.equal(attack.phase, "finished");
  assert.deepEqual(attack.results.map((r) => r.name), order.map((p) => p.name));
  const sum = attack.results.reduce((s, r) => s + r.caseTime, 0);
  assert.equal(sum, attack.results.at(-1).split);
  assert.equal(attack.elapsed(999999), attack.endTime - attack.startTime);
  // Moves after the end are tracked but change nothing.
  assert.equal(step(attack, "R", clock.t + 1), null);
});

test("waits for a PLL state before arming, timer starts on the move after", () => {
  const scrambled = applyAlg(SOLVED, "R U F");
  const attack = new Attack(MODES.PLL, scrambled);
  assert.equal(attack.phase, "waiting");
  const clock = { t: 0 };
  for (const m of ["F'", "U'", "R'"]) assert.equal(step(attack, m, (clock.t += 10)), null);
  assert.equal(attack.phase, "armed");
  assert.equal(attack.startTime, null);
  play(attack, "U", clock);
  assert.equal(attack.phase, "running");
  assert.equal(attack.startTime, clock.t);
});

test("restart", () => {
  const attack = new Attack(MODES.PLL, SOLVED);
  const clock = { t: 0 };
  play(attack, alg("Aa"), clock);
  assert.equal(attack.results.length, 1);
  attack.restart();
  assert.equal(attack.results.length, 0);
  assert.equal(attack.phase, "armed");
  attack.update(applyAlg(SOLVED, "R"), 0);
  attack.restart();
  assert.equal(attack.phase, "waiting");
});

test("acubemy may send a move's state before the move: the timer still starts", () => {
  const attack = new Attack(MODES.PLL, SOLVED);
  assert.equal(attack.update(applyAlg(SOLVED, "L"), 100), null); // state of the first move...
  assert.equal(attack.phase, "armed");
  assert.equal(attack.start(100), true); // ...then the move itself
  assert.equal(attack.phase, "running");
});

test("restart(facelets) takes acubemy's real state when it arrives", () => {
  // The plugin can open on the SDK's default solved cube, then get acubemy's real state.
  const attack = new Attack(MODES.PLL, SOLVED);
  attack.restart(applyAlg(SOLVED, "R U F"));
  assert.equal(attack.phase, "waiting");
  assert.equal(attack.start(10), false); // turning a scrambled cube doesn't start the timer
  const tPerm = applyAlg(SOLVED, toHostFrame(alg("T")));
  assert.equal(attack.update(tPerm, 20), null); // reaching a PLL state arms, nothing is counted
  assert.equal(attack.phase, "armed");
  assert.deepEqual(attack.results, []);
});

test("a scrambled state during the attack keeps it running", () => {
  const attack = new Attack(MODES.PLL, SOLVED);
  attack.start(0);
  attack.update(applyAlg(SOLVED, "R"), 0); // in the middle of an alg
  assert.equal(attack.phase, "running");
  assert.equal(attack.baseline, SOLVED);
});

test("state-driven: start() on the move, update() with acubemy's facelets", () => {
  const attack = new Attack(MODES.PLL, SOLVED);
  assert.equal(attack.start(500), true);
  assert.equal(attack.start(600), false);
  const t = applyAlg(SOLVED, toHostFrame(alg("T")));
  assert.deepEqual(attack.update(t, 2500), { type: "case", result: { name: "T", caseTime: 2000, split: 2000 } });
});

test("OLL attack: all 57 in a shuffled order, from whatever state the last one left", () => {
  const attack = new Attack(MODES.OLL, SOLVED);
  const clock = { t: 0 };
  const order = shuffle(OLL_ALGS, 2);
  attack.order = order.map((o) => o.name); // the player dragged the table into this order
  order.forEach(({ name, alg }, i) => {
    clock.t += 1000; // a pause between algs: two algs in a row are not one case
    play(attack, `${["", "U", "U2", "U'"][i % 4]} ${alg}`, clock);
    // Some algs solve F2L halfway (OLL 41 = Sune + F R U R' U' F'): one case still.
    assert.deepEqual(attack.results.map((r) => r.name), order.slice(0, i + 1).map((o) => o.name), `OLL ${name}`);
  });
  assert.equal(attack.phase, "finished");
  assert.deepEqual(attack.results.map((r) => r.name), order.map((o) => o.name));
});

test("OLL attack: a PLL or an AUF doesn't count, a scrambled F2L waits", () => {
  const attack = new Attack(MODES.OLL, SOLVED);
  const clock = { t: 0 };
  assert.deepEqual(play(attack, "R U R' U' R' F R2 U' R' U' R U R' F' U2", clock), []); // T perm
  assert.equal(attack.phase, "running");
  assert.equal(new Attack(MODES.OLL, applyAlg(SOLVED, "R")).phase, "waiting");
  assert.equal(new Attack(MODES.OLL, applyAlg(SOLVED, toHostFrame("R U R' U R U2 R'"))).phase, "armed");
  assert.equal(new Attack(MODES.PLL, applyAlg(SOLVED, toHostFrame("R U R' U R U2 R'"))).phase, "waiting");
});

test("OLL attack: an alg that solves F2L halfway counts as one case when done in one go", () => {
  // OLL 3 = OLL 44 (f R U R' U' f'), U', OLL 45 (F R U R' U' F').
  const oll3 = "f R U R' U' f' U' F R U R' U' F'";
  const fluent = new Attack(MODES.OLL, SOLVED);
  const events = play(fluent, oll3, { t: 0 });
  assert.deepEqual(events.map((e) => e.result.name), ["44", "3"]); // 44 shows, then becomes 3
  assert.deepEqual(fluent.results.map((r) => r.name), ["3"]);
  assert.equal(fluent.results[0].caseTime, 1200); // 13 moves, 100 ms apart

  // With a pause after f', the two parts are two cases.
  const paused = new Attack(MODES.OLL, SOLVED);
  const clock = { t: 0 };
  play(paused, "f R U R' U' f'", clock);
  clock.t += 1000;
  play(paused, "U' F R U R' U' F'", clock);
  assert.deepEqual(paused.results.map((r) => r.name), ["44", "45"]);

  // If the whole case is already done, the second part counts on its own.
  const done = new Attack(MODES.OLL, SOLVED);
  play(done, oll3, { t: 0 });
  const later = { t: 10000 };
  assert.deepEqual(play(done, oll3, later).map((e) => e.type), ["case", "case"]);
  assert.deepEqual(done.results.map((r) => r.name), ["3", "44", "45"]);
});

test("OLL attack: one case or two? The earliest case of the planned order wins", () => {
  // OLL 18 is OLL 7, U2, OLL 8: F2L is solved after OLL 7.
  const fused = `${alg("7")} U2 ${alg("8")}`;
  const run = (order) => {
    const attack = new Attack(MODES.OLL, SOLVED);
    attack.order = [...order, ...MODES.OLL.names.filter((n) => !order.includes(n))];
    const clock = { t: 0 };
    play(attack, fused, clock);
    const first = attack.results.map((r) => r.name);
    clock.t += 2000;
    play(attack, fused, clock);
    return [first, attack.results.map((r) => r.name)];
  };
  assert.deepEqual(run(["7", "8", "18"]), [["7", "8"], ["7", "8", "18"]]);
  assert.deepEqual(run(["18", "7", "8"]), [["18"], ["18", "7", "8"]]);
  // 7 before 18 before 8: 7 then 8 still wins (7 is the earliest).
  assert.deepEqual(run(["7", "18", "8"])[0], ["7", "8"]);
  // Already done parts don't count: 7 done, then 8 alone vs 18, 18 first.
  const attack = new Attack(MODES.OLL, SOLVED);
  attack.order = ["7", "18", "8", ...MODES.OLL.names.filter((n) => !["7", "8", "18"].includes(n))];
  const clock = { t: 0 };
  play(attack, alg("7"), clock);
  clock.t += 2000;
  play(attack, fused, clock);
  assert.deepEqual(attack.results.map((r) => r.name), ["7", "18"]);
});

test("OLL attack: a PLL or an AUF right after a case ends its alg: no merge with the next case", () => {
  for (const between of ["R U R' U' R' F R2 U' R' U' R U R' F'", "R U R' U' U R U' R'"]) {
    const attack = new Attack(MODES.OLL, SOLVED);
    attack.order = ["41", ...MODES.OLL.names.filter((n) => n !== "41")]; // so a merge would win
    const clock = { t: 0 };
    play(attack, alg("27"), clock); // Sune
    play(attack, between, clock); // right after: a T perm, or a sexy move undone
    clock.t += 2000;
    play(attack, alg("45"), clock); // Sune + OLL 45 would be OLL 41
    assert.deepEqual(attack.results.map((r) => r.name), ["27", "45"], between);
  }
});

test("the planned order is kept for each attack, across restarts", () => {
  const attack = new Attack(MODES.OLL, SOLVED);
  attack.order = ["57", ...MODES.OLL.names.slice(0, 56)];
  attack.restart(SOLVED, MODES.PLL);
  assert.deepEqual(attack.order, MODES.PLL.names);
  attack.restart(SOLVED, MODES.OLL);
  assert.equal(attack.order[0], "57");
});

test("PLL attack: two PLLs in a row are never merged", () => {
  const attack = new Attack(MODES.PLL, SOLVED);
  const clock = { t: 0 };
  play(attack, alg("T"), clock);
  play(attack, alg("Ua"), clock);
  assert.deepEqual(attack.results.map((r) => r.name), ["T", "Ua"]);
});

test("restart can switch to the other attack, even while one is running", () => {
  const attack = new Attack(MODES.PLL, SOLVED);
  play(attack, alg("Aa"), { t: 0 });
  attack.restart(attack.facelets, MODES.OLL);
  assert.equal(attack.mode, MODES.OLL);
  assert.equal(attack.phase, "armed"); // in the middle of the PLL attack: the timer is reset too
  assert.equal(attack.startTime, null);
  assert.deepEqual(attack.results, []);
});

test("reset gesture: U4 or D4 in one direction, within 2 seconds", () => {
  const moves = (list, gap = 200) => list.map((move, i) => ({ move, time: 1000 + i * gap }));
  assert.ok(isResetGesture(moves(["U", "U", "U", "U"])));
  assert.ok(isResetGesture(moves(["D'", "D'", "D'", "D'"])));
  assert.ok(isResetGesture(moves(["R", "U", "U", "U", "U"]))); // only the last 4 count
  assert.ok(!isResetGesture(moves(["U", "U", "U"])));
  assert.ok(!isResetGesture(moves(["U", "U", "U'", "U"]))); // mixed directions
  assert.ok(!isResetGesture(moves(["R", "R", "R", "R"]))); // other faces
  assert.ok(!isResetGesture(moves(["U", "U", "U", "U"], 1000))); // 3 s: too slow
});
