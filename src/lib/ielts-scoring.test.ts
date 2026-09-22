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

describe("rawToBand", () => {
  it("maps 10-item raw scores into half-step bands", () => {
    assert.equal(rawToBand("LISTENING", 0, 10), 0);
    assert.equal(rawToBand("READING", 10, 10), 9.0);
    assert.equal(rawToBand("LISTENING", 5, 10), 5.0);
  });
});
