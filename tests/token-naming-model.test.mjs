// Tests for the Token Naming Builder model (tools/token-naming-model.js).
// Each test loads a project file through loadProjectState, the same way the
// builder does for autosave, undo/redo, imports and presets, and checks the
// tokens it produces or the project file it writes back.
//
// Usage: node --test tests/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import model from "../tools/token-naming-model.js";

const AXES = [
  { id: "category", name: "category", locked: true, slot: "category" },
  { id: "ax1", name: "family", locked: false, slot: "middle" },
  { id: "ax2", name: "role", locked: false, slot: "middle" },
  { id: "ax3", name: "state", locked: false, slot: "middle" },
];

const list = (...values) => ({ type: "custom", config: {}, list: values });
const ALL = (generator) => ({ id: "gAll", condition: {}, generator });

function project(values, extra = {}) {
  return {
    version: 3,
    tierMode: "tier2",
    projectTitle: "Test",
    namespaceEnabled: false,
    namespaceValue: "",
    axes: AXES,
    categories: [{ id: "cat1", name: "color", dtcgType: "color", values }],
    ...extra,
  };
}

function load(data) {
  const err = model.loadProjectState(data);
  assert.equal(err, null, `project should load, got: ${err}`);
  return model.allTokenNames();
}

test("a matching conditional group replaces ALL; others get ALL", () => {
  const names = load(
    project({
      ax1: { groups: [ALL(list("brand", "feedback"))] },
      ax2: {
        groups: [
          ALL(list("surface", "text", "border")),
          { id: "g1", condition: { ax1: ["feedback"] }, generator: list("text") },
        ],
      },
      ax3: { unused: true, groups: [ALL(list())] },
    }),
  );
  assert.deepEqual(names.sort(), [
    "color-brand-border",
    "color-brand-surface",
    "color-brand-text",
    "color-feedback-text",
  ]);
});

test("several matching conditional groups combine their values", () => {
  const names = load(
    project({
      ax1: { groups: [ALL(list("brand", "feedback"))] },
      ax2: {
        groups: [
          ALL(list("surface")),
          { id: "g1", condition: { ax1: ["brand", "feedback"] }, generator: list("text") },
          { id: "g2", condition: { ax1: ["feedback"] }, generator: list("icon", "text") },
        ],
      },
      ax3: { unused: true, groups: [ALL(list())] },
    }),
  );
  assert.deepEqual(names.sort(), [
    "color-brand-text",
    "color-feedback-icon",
    "color-feedback-text",
  ]);
});

test("conditions match omitted values, which still add nothing to the name", () => {
  const names = load(
    project({
      ax1: { groups: [ALL(list("[base]", "accent"))] },
      ax2: { unused: true, groups: [ALL(list())] },
      ax3: {
        groups: [
          ALL(list("hover")),
          { id: "g1", condition: { ax1: ["[base]"] }, generator: list("[default]", "pressed") },
        ],
      },
    }),
  );
  // [base] + [default] names nothing past the category, so it makes no token,
  // as in the builder before groups.
  assert.deepEqual(names.sort(), ["color-accent-hover", "color-pressed"]);
});

test("a group's token type applies to the tokens its condition matches", () => {
  load(
    project({
      ax1: { groups: [ALL(list("heading", "weight"))] },
      ax2: {
        groups: [
          ALL(list("md")),
          { id: "g1", condition: { ax1: ["weight"] }, generator: list("bold"), tokenType: "fontWeight" },
        ],
      },
      ax3: { unused: true, groups: [ALL(list())] },
    }),
  );
  assert.deepEqual(model.allTokens(), [
    { path: ["color", "heading", "md"], type: "color" },
    { path: ["color", "weight", "bold"], type: "fontWeight" },
  ]);
});

test("a token type is rejected unless the condition includes the axis right after category", () => {
  const good = project({ ax1: { groups: [ALL(list("a"))] } });
  load(good);
  const err = model.loadProjectState(
    project({
      ax1: { groups: [ALL(list("a"))] },
      ax2: { groups: [ALL(list("b"))] },
      ax3: {
        groups: [
          ALL(list("c")),
          { id: "g1", condition: { ax2: ["b"] }, generator: list("d"), tokenType: "color" },
        ],
      },
    }),
  );
  assert.match(err, /token type.*"family", the axis right after category/);
  assert.deepEqual(model.allTokenNames(), ["color-a"], "previous project stays loaded");
});

test("each axis needs exactly one ALL group", () => {
  const err = model.loadProjectState(
    project({ ax1: { groups: [ALL(list("a")), { ...ALL(list("b")), id: "g2" }] } }),
  );
  assert.match(err, /exactly one ALL group/);
});

test("a condition may only name earlier axes", () => {
  const err = model.loadProjectState(
    project({
      ax1: { groups: [ALL(list("a")), { id: "g1", condition: { ax2: ["b"] }, generator: list("x") }] },
    }),
  );
  assert.match(err, /condition on "role", which is not an earlier axis/);
});

const LEGACY_V2 = {
  version: 2,
  tierMode: "tier2",
  projectTitle: "Saved before groups",
  namespaceEnabled: false,
  namespaceValue: "",
  axes: AXES,
  categories: [
    {
      id: "cat1",
      name: "color",
      dtcgType: "color",
      values: {
        ax1: {
          mode: "branched",
          branches: [
            {
              id: "br1",
              value: "brand",
              dtcgType: "",
              values: {
                ax2: list("surface", "text"),
                ax3: list("[default]", "hover"),
                _combinationConfig: {
                  rules: [{ selections: { ax2: ["surface"], ax3: ["[default]", "hover"] } }],
                  additions: [{ ax2: "text", ax3: "[default]" }],
                },
              },
            },
            {
              id: "br2",
              value: "weight",
              dtcgType: "fontWeight",
              values: { ax2: list("bold"), ax3: { type: "unused", config: {}, list: [] } },
            },
          ],
        },
        ax2: { type: "unused", config: {}, list: [] },
        ax3: { type: "unused", config: {}, list: [] },
      },
    },
  ],
  axisSeq: 3,
  catSeq: 1,
  brSeq: 2,
};

test("an old project converts branches and combinations to groups", () => {
  load(LEGACY_V2);
  assert.deepEqual(model.allTokens(), [
    { path: ["color", "brand", "surface"], type: "color" },
    { path: ["color", "brand", "surface", "hover"], type: "color" },
    { path: ["color", "brand", "text"], type: "color" },
    { path: ["color", "weight", "bold"], type: "fontWeight" },
  ]);
});

test("the builder writes converted projects in the new version, which reload the same", () => {
  load(LEGACY_V2);
  const saved = model.serializeState();
  assert.equal(saved.version, 3);
  assert.equal("brSeq" in saved, false);
  for (const [axId, entry] of Object.entries(saved.categories[0].values)) {
    assert.ok(Array.isArray(entry.groups), `${axId} has groups`);
    assert.equal(entry.groups.filter((g) => !Object.keys(g.condition).length).length, 1);
  }
  const json = JSON.stringify(saved);
  assert.doesNotMatch(json, /branched|_combinationConfig/);
  const before = model.allTokens();
  load(JSON.parse(json));
  assert.deepEqual(model.allTokens(), before);
});

test("a branch token type deeper in the formula still converts", () => {
  load({
    ...LEGACY_V2,
    categories: [
      {
        id: "cat1",
        name: "border",
        dtcgType: "dimension",
        values: {
          ax1: list("ui", "focus"),
          ax2: {
            mode: "branched",
            branches: [
              { id: "br1", value: "width", dtcgType: "", values: { ax3: list("sm") } },
              { id: "br2", value: "style", dtcgType: "strokeStyle", values: { ax3: list("solid") } },
            ],
          },
          ax3: { type: "unused", config: {}, list: [] },
        },
      },
    ],
  });
  const types = Object.fromEntries(model.allTokens().map((t) => [t.path.join("."), t.type]));
  assert.deepEqual(types, {
    "border.ui.width.sm": "dimension",
    "border.ui.style.solid": "strokeStyle",
    "border.focus.width.sm": "dimension",
    "border.focus.style.solid": "strokeStyle",
  });
});

test("converting a deeper branch's token type doesn't tie its values to today's first-axis values", () => {
  load({
    ...LEGACY_V2,
    categories: [
      {
        id: "cat1",
        name: "border",
        dtcgType: "dimension",
        values: {
          ax1: list("ui"),
          ax2: {
            mode: "branched",
            branches: [
              { id: "br1", value: "width", dtcgType: "", values: { ax3: list("sm") } },
              { id: "br2", value: "style", dtcgType: "strokeStyle", values: { ax3: list("solid") } },
            ],
          },
          ax3: { type: "unused", config: {}, list: [] },
        },
      },
    ],
  });
  // Add a value to the first axis's ALL group, as the builder lets you.
  const saved = model.serializeState();
  saved.categories[0].values.ax1.groups[0].generator.list.push("focus");
  const names = load(saved);
  assert.ok(names.includes("border-focus-style-solid"), names.join(", "));
  assert.ok(!names.includes("border-focus-style"), names.join(", "));
});
