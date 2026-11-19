// Tests for what the Token Naming Builder's output panel shows: one string per
// tab (Tokens Preview, DTCG JSON, CSS Variables, Markdown Spec), the header's
// token count and collision warnings, and the preview's filter.
//
// The tab outputs are checked against the recorded fixtures for every preset
// in docs/fixtures/naming-builder/.
//
// Usage: node --test tests/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import model from "../tools/token-naming-model.js";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../docs/fixtures/naming-builder",
);
const PRESETS = ["basic", "full", "families", "semantic-color", "typography-compound"];

const fixture = (name, file) => readFileSync(join(fixturesDir, name, file), "utf8");
const cssNames = (css) => [...css.matchAll(/^\s*--([^:\s]+)\s*:/gm)].map((m) => m[1]);

function loadFixture(name) {
  const err = model.loadProjectState(JSON.parse(fixture(name, "project.json")));
  assert.equal(err, null, `${name} did not load: ${err}`);
}

// The families preset was recorded before groups replaced branched axes, so
// its Markdown described the branched family axis. With groups (ADR 0001) the
// same tokens are described as conditional groups on the scale axis.
const MARKDOWN_GROUPS_CHANGE = {
  families: [
    [
      [
        "- **family** (branched)",
        "  - **radius**",
        "    - **Token type**: _not set_",
        "    - **scale** (T-shirt sizes): xs, sm, md, lg, xl",
        "  - **width**",
        "    - **Token type**: _not set_",
        "    - **scale** (Numeric range): 1, 2, 3, 4",
      ].join("\n"),
      [
        "- **family** (Custom list): radius, width",
        "- **scale** (Custom list): _none_",
        "  - when family = radius (T-shirt sizes): xs, sm, md, lg, xl",
        "  - when family = width (Numeric range): 1, 2, 3, 4",
      ].join("\n"),
    ],
  ],
};

function expectedMarkdown(name) {
  let md = fixture(name, "naming.md");
  for (const [before, after] of MARKDOWN_GROUPS_CHANGE[name] || []) {
    assert.ok(md.includes(before), `${name}/naming.md no longer has the branched block`);
    md = md.replace(before, after);
  }
  return md;
}

for (const name of PRESETS) {
  test(`${name}: CSS Variables tab matches tokens.css`, () => {
    loadFixture(name);
    assert.equal(model.buildCssExport(), fixture(name, "tokens.css"));
  });

  test(`${name}: DTCG JSON tab matches tokens.json`, () => {
    loadFixture(name);
    assert.equal(model.buildDtcgExport(), fixture(name, "tokens.json"));
  });

  test(`${name}: Markdown Spec tab matches naming.md`, () => {
    loadFixture(name);
    assert.equal(model.buildExport(), expectedMarkdown(name));
  });

  test(`${name}: Tokens Preview lists the tokens.css names in order`, () => {
    loadFixture(name);
    const names = cssNames(fixture(name, "tokens.css"));
    const preview = model.tokenPreview();
    assert.deepEqual(
      preview.flatMap((c) => c.tokens.map((t) => t.name)),
      names,
    );
    assert.equal(model.buildTokenList(), names.join("\n") + "\n");
    assert.equal(model.tokenCount(), names.length);
  });
}

test("each preview token is split into its parts, namespace and category first", () => {
  loadFixture("semantic-color");
  model.setNamespace("mds");
  const [color] = model.tokenPreview();
  const first = color.tokens[0];
  assert.equal(first.name, first.parts.map((p) => p.val).join("-"));
  assert.deepEqual(first.parts.slice(0, 2), [
    { axisId: "namespace", val: "mds" },
    { axisId: "category", val: color.name },
  ]);
  assert.ok(first.parts.slice(2).every((p) => p.axisId !== "category"));
});

test("preview categories carry their count and token type", () => {
  loadFixture("full");
  const preview = model.tokenPreview();
  const json = JSON.parse(fixture("full", "tokens.json"));
  assert.deepEqual(
    preview.map((c) => c.name),
    Object.keys(json).filter((k) => !k.startsWith("$")),
  );
  preview.forEach((c) => {
    assert.equal(c.count, c.tokens.length);
    assert.equal(c.type, json[c.name].$type || "");
  });
});

test("the filter keeps tokens whose name contains the query, ignoring case", () => {
  loadFixture("full");
  const all = model.tokenPreview().flatMap((c) => c.tokens.map((t) => t.name));
  const query = all[3].split("-").slice(-1)[0];
  const filtered = model.tokenPreview("  " + query.toUpperCase() + " ");
  const names = filtered.flatMap((c) => c.tokens.map((t) => t.name));
  assert.ok(names.length > 0 && names.length < all.length);
  assert.deepEqual(names, all.filter((n) => n.includes(query)));
  assert.ok(filtered.every((c) => c.tokens.length > 0), "empty categories drop out");
  assert.equal(model.buildTokenList(query), names.join("\n") + "\n");
});

test("the filter keeps each category's full count", () => {
  loadFixture("full");
  const full = model.tokenPreview();
  const all = full.flatMap((c) => c.tokens.map((t) => t.name));
  const filtered = model.tokenPreview(all[0]);
  const cat = filtered.find((c) => c.name === full[0].name);
  assert.equal(cat.count, full[0].count);
});

test("a filter that matches nothing gives no categories and an empty list", () => {
  loadFixture("basic");
  assert.deepEqual(model.tokenPreview("no-such-token-anywhere"), []);
  assert.equal(model.buildTokenList("no-such-token-anywhere"), "");
});

test("collisions are reported per category and for the whole project", () => {
  const err = model.loadProjectState({
    version: 3,
    tierMode: "tier2",
    projectTitle: "Test",
    namespaceEnabled: false,
    namespaceValue: "",
    axes: [
      { id: "category", name: "category", locked: true, slot: "category" },
      { id: "ax1", name: "role", locked: false, slot: "middle" },
      { id: "ax2", name: "state", locked: false, slot: "middle" },
    ],
    categories: [
      {
        id: "cat1",
        name: "color",
        dtcgType: "color",
        values: {
          ax1: { groups: [{ id: "g1", condition: {}, generator: { type: "custom", config: {}, list: ["text", "text-hover"] } }] },
          ax2: { groups: [{ id: "g2", condition: {}, generator: { type: "custom", config: {}, list: ["[default]", "hover"] } }] },
        },
      },
    ],
  });
  assert.equal(err, null);
  const [color] = model.tokenPreview();
  assert.deepEqual(color.collisions, ["text-hover"]);
  assert.deepEqual(model.tokenCollisions(), ["color.text-hover"]);
});

test("no collisions in any preset", () => {
  for (const name of PRESETS) {
    loadFixture(name);
    assert.deepEqual(model.tokenCollisions(), [], name);
  }
});
