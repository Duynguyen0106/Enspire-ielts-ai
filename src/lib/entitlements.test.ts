import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FEATURES, type FeatureKey } from "./feature-matrix";

describe("feature matrix", () => {
  it("defines all required features", () => {
    const keys: FeatureKey[] = [
      "PLACEMENT_TEST",
      "LESSON_ACCESS",
      "LISTENING_READING_PRACTICE",
      "WRITING_SUBMISSION",
      "SPEAKING_SESSION",
      "FULL_LEVEL_TEST",
      "MODEL_ANSWERS",
      "PROGRESS_EXPORT",
    ];
    for (const key of keys) {
      assert.ok(FEATURES[key], key);
      assert.ok(FEATURES[key].period);
    }
  });

  it("free tier is more restrictive than pro for numeric limits", () => {
    assert.equal(FEATURES.LISTENING_READING_PRACTICE.free, 5);
    assert.equal(FEATURES.LISTENING_READING_PRACTICE.pro, 100);
    assert.equal(FEATURES.WRITING_SUBMISSION.free, 3);
    assert.equal(FEATURES.SPEAKING_SESSION.free, 3);
  });

  it("pro unlocks model answers and export", () => {
    assert.equal(FEATURES.MODEL_ANSWERS.free, false);
    assert.equal(FEATURES.MODEL_ANSWERS.pro, true);
    assert.equal(FEATURES.PROGRESS_EXPORT.free, false);
    assert.equal(FEATURES.PROGRESS_EXPORT.pro, true);
  });

  it("free lesson/test access is level<=1", () => {
    assert.equal(FEATURES.LESSON_ACCESS.free, "level<=1");
    assert.equal(FEATURES.FULL_LEVEL_TEST.free, "level<=1");
    assert.equal(FEATURES.LESSON_ACCESS.pro, "all");
  });
});

describe("level rule helper", () => {
  function levelAllowed(rule: string | number | boolean, level?: number) {
    if (rule === "all" || rule === true) return true;
    if (rule === false) return false;
    if (typeof rule === "string" && rule.startsWith("level<=")) {
      const max = Number(rule.replace("level<=", ""));
      return (level ?? 1) <= max;
    }
    return true;
  }

  it("allows level 1 on free", () => {
    assert.equal(levelAllowed("level<=1", 1), true);
    assert.equal(levelAllowed("level<=1", 2), false);
  });

  it("allows all on pro", () => {
    assert.equal(levelAllowed("all", 9), true);
  });
});
