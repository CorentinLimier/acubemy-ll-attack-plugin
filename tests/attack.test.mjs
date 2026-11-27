import { test } from "node:test";
import assert from "node:assert/strict";
import { SOLVED, applyAlg, applyMove } from "../cube.js";
import { toHostFrame } from "../pll.js";
import { ALGS } from "./algs.mjs";
import { PllAttack } from "../attack.js";

// What acubemy sends: quarter turns only, so "R2" arrives as "R R".
function quarterTurns(alg) {
  return alg.trim().split(/\s+/).flatMap((m) => (m.endsWith("2") ? [m[0], m[0]] : [m]));
}

// What the plugin does for each move: start() on the move, update() with the new state.
function step(attack, move, now) {
  attack.start(now);
  return attack.update(applyMove(attack.facelets, move), now);
}

function play(attack, alg, clock) {
  const events = [];
  for (const m of quarterTurns(toHostFrame(alg))) {
    clock.t += 100;
    const e = step(attack, m, clock.t);
    if (e) events.push(e);
  }
  return events;
}

test("full attack in a shuffled order with AUFs, a repeat and an extra AUF", () => {
  const attack = new PllAttack(SOLVED);
  assert.equal(attack.phase, "armed");
  const clock = { t: 1000 };
  const order = [...ALGS].sort(() => Math.random() - 0.5);
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
    assert.equal(ev[0].type, i === order.length - 1 ? "finish" : "pll");
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
  const attack = new PllAttack(scrambled);
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
  const attack = new PllAttack(SOLVED);
  const clock = { t: 0 };
  play(attack, ALGS[0].alg, clock);
  assert.equal(attack.results.length, 1);
  attack.restart();
  assert.equal(attack.results.length, 0);
  assert.equal(attack.phase, "armed");
  attack.update(applyAlg(SOLVED, "R"), 0);
  attack.restart();
  assert.equal(attack.phase, "waiting");
});

test("state-driven: start() on the move, update() with acubemy's facelets", () => {
  const attack = new PllAttack(SOLVED);
  assert.equal(attack.start(500), true);
  assert.equal(attack.start(600), false);
  const t = applyAlg(SOLVED, toHostFrame(ALGS.find((p) => p.name === "T").alg));
  assert.deepEqual(attack.update(t, 2500), { type: "pll", result: { name: "T", caseTime: 2000, split: 2000 } });
});
