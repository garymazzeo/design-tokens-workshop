// Tests for the Token Naming Builder's presets and Clear: which presets the
// header's dropdown offers for each tier, that each preset loads, and what
// the multi-brand semantic preset and Clear produce.
//
// Usage: node --test tests/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import model from "../tools/token-naming-model.js";

function loadPreset(key) {
  const err = model.loadProjectState(model.presetProject(key));
  assert.equal(err, null, `${key} did not load: ${err}`);
  return model.serializeState();
}

const names = () => model.allTokenNames();

test("the dropdown offers each tier's presets, in order", () => {
  assert.deepEqual(
    model.presetsForTier("tier1").map((p) => p.key),
    ["basic", "full", "families"],
  );
  assert.deepEqual(
    model.presetsForTier("tier2").map((p) => p.key),
    ["semantic-color", "typography-compound", "multi-brand-semantic"],
  );
  model.PRESETS.forEach((p) => assert.ok(p.label, `${p.key} has a label`));
});

test("every preset loads in its own tier with the default title", () => {
  for (const { key, tier } of model.PRESETS) {
    const state = loadPreset(key);
    assert.equal(state.tierMode, tier, key);
    assert.equal(state.projectTitle, tier === "tier2" ? "Tier 2 Tokens" : "Tier 1 Tokens", key);
    assert.ok(names().length > 0, `${key} makes tokens`);
  }
});

test("an unknown preset has no project", () => {
  assert.equal(model.presetProject("nope"), null);
});

test("presetProject returns a fresh copy each time", () => {
  const a = model.presetProject("basic");
  a.categories.length = 0;
  assert.ok(model.presetProject("basic").categories.length > 0);
});

/* ── Multi-brand semantic (Mosaic-style) ─────────────── */

test("multi-brand semantic: mds namespace and its formula", () => {
  const state = loadPreset("multi-brand-semantic");
  assert.equal(state.tierMode, "tier2");
  assert.equal(state.namespaceEnabled, true);
  assert.equal(state.namespaceValue, "mds");
  assert.deepEqual(
    state.axes.map((a) => a.name),
    ["namespace", "category", "family", "variant", "role", "prominence", "scale", "state"],
  );
  assert.ok(names().every((n) => n.startsWith("mds-")));
});

test("multi-brand semantic: variants depend on the family", () => {
  loadPreset("multi-brand-semantic");
  const color = names().filter((n) => n.startsWith("mds-color-"));
  const variants = (family) =>
    [...new Set(color.filter((n) => n.startsWith(`mds-color-${family}-`)).map((n) => n.split("-")[3]))];
  assert.deepEqual(variants("brand"), ["primary", "secondary", "accent"]);
  assert.deepEqual(variants("feedback"), ["critical", "caution", "positive", "info"]);
  assert.ok(color.includes("mds-color-brand-primary-container"));
  assert.ok(color.includes("mds-color-feedback-critical-text-hover"));
  assert.ok(!color.some((n) => n.startsWith("mds-color-brand-critical")));
  assert.ok(!color.some((n) => n.startsWith("mds-color-feedback-primary")));
});

test("multi-brand semantic: scale is Unused for color", () => {
  const state = loadPreset("multi-brand-semantic");
  const scale = state.axes.find((a) => a.name === "scale");
  const color = state.categories.find((c) => c.name === "color");
  assert.equal(color.values[scale.id].unused, true);
  assert.ok(!names().some((n) => /^mds-color-.*-(xs|sm|md|lg|xl)(-|$)/.test(n)));
});

test("multi-brand semantic: prominence base and default state are omitted", () => {
  loadPreset("multi-brand-semantic");
  const n = names();
  assert.ok(n.includes("mds-color-brand-primary-container"));
  assert.ok(n.includes("mds-color-brand-primary-container-bold"));
  assert.ok(n.includes("mds-color-brand-primary-container-bold-hover"));
  assert.ok(!n.some((x) => x.includes("base") || x.includes("default")));
});

test("multi-brand semantic: tokens.json types every color token as color", () => {
  loadPreset("multi-brand-semantic");
  const tokens = model.allTokens();
  assert.ok(
    tokens.filter((t) => t.path[1] === "color").every((t) => t.type === "color"),
  );
  assert.ok(tokens.filter((t) => t.path[1] === "space").every((t) => t.type === "dimension"));
});

/* ── Clear ───────────────────────────────────────────── */

test("clearProject leaves one empty color category and keeps the tier", () => {
  loadPreset("multi-brand-semantic");
  model.clearProject();
  const state = model.serializeState();
  assert.equal(state.tierMode, "tier2");
  assert.equal(state.projectTitle, "Tier 2 Tokens");
  assert.equal(state.namespaceEnabled, false);
  assert.equal(state.namespaceValue, "");
  assert.deepEqual(state.axes.map((a) => a.name), ["category", "scale"]);
  assert.deepEqual(state.categories.map((c) => [c.name, c.dtcgType]), [["color", "color"]]);
  assert.deepEqual(names(), []);
});

test("clearProject in Tier 1 keeps scale as the locked last axis", () => {
  loadPreset("full");
  model.clearProject();
  const state = model.serializeState();
  assert.equal(state.tierMode, "tier1");
  assert.equal(state.projectTitle, "Tier 1 Tokens");
  assert.deepEqual(state.axes.map((a) => [a.name, a.slot]), [["category", "category"], ["scale", "scale"]]);
});
