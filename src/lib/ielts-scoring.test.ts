import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  averageOverallBand,
  levelFromBand,
  rawToBand,
  roundBand,
} from "./ielts-scoring";

describe("roundBand (IELTS overall rounding)", () => {
  it("rounds .25 up to .5", () => {
    assert.equal(roundBand(5.25), 5.5);
  });

  it("rounds .75 up to next whole", () => {
    assert.equal(roundBand(5.75), 6.0);
  });

  it("keeps exact .0 and .5", () => {
    assert.equal(roundBand(5.0), 5.0);
    assert.equal(roundBand(6.5), 6.5);
  });

  it("rounds .24 down to whole", () => {
    assert.equal(roundBand(5.24), 5.0);
  });

  it("clamps to 0–9", () => {
    assert.equal(roundBand(0), 0);
    assert.equal(roundBand(9.2), 9);
  });
});

describe("averageOverallBand", () => {
  it("averages then applies official rounding", () => {
    // (5+5+5+6)/4 = 5.25 → 5.5
    assert.equal(averageOverallBand([5, 5, 5, 6]), 5.5);
    // (5+5+6+7)/4 = 5.75 → 6.0
    assert.equal(averageOverallBand([5, 5, 6, 7]), 6.0);
  });
});

describe("levelFromBand", () => {
  it("maps band to level 1–9", () => {
    assert.equal(levelFromBand(0.5), 1);
    assert.equal(levelFromBand(5.5), 6);
    assert.equal(levelFromBand(9), 9);
  });
});

describe("rawToBand20", () => {
  it("maps 20-item raw scores", async () => {
    const { rawToBand20, evaluatePassing } = await import("./ielts-scoring");
    assert.equal(rawToBand20("LISTENING", 0), 0);
    assert.equal(rawToBand20("READING", 20), 9.0);
    assert.equal(rawToBand20("LISTENING", 10), 5.0);
    const r = evaluatePassing(
      { listening: 5, reading: 5, writing: 5, speaking: 4 },
      { minOverallBand: 5, minSkillBand: 4.5 }
    );
    assert.equal(r.passed, false);
    assert.ok(r.failedSkills.includes("SPEAKING"));
  });
});
