// Tests for the edits the Token Naming Builder's board makes to a project.
// Each test loads a project file through loadProjectState, applies one board
// edit through the model's public functions, and checks the token names or the
// project file the builder would write.
//
// Usage: node --test tests/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import model from "../tools/token-naming-model.js";

const AXES = [
  { id: "category", name: "category", locked: true, slot: "category" },
  { id: "ax1", name: "family", locked: false, slot: "middle" },
  { id: "ax2", name: "role", locked: false, slot: "middle" },
];

const list = (...values) => ({ type: "custom", config: {}, list: values });
const ALL = (generator) => ({ id: "gAll", condition: {}, generator });

function load(values = {}, extra = {}) {
  const err = model.loadProjectState({
    version: 3,
    tierMode: "tier2",
    projectTitle: "Test",
    namespaceEnabled: false,
    namespaceValue: "",
    axes: AXES,
    categories: [
      {
        id: "cat1",
        name: "color",
        dtcgType: "color",
        values: {
          ax1: { groups: [ALL(list("brand", "feedback"))] },
          ax2: { groups: [ALL(list("text", "icon"))] },
          ...values,
        },
      },
    ],
    ...extra,
  });
  assert.equal(err, null, `project should load, got: ${err}`);
}

const names = () => model.allTokenNames().sort();
const entry = (axId, catId = "cat1") =>
  model.serializeState().categories.find((c) => c.id === catId).values[axId];

test("a namespace prefixes every token name; an empty one removes it", () => {
  load();
  model.setNamespace(" MDS ");
  assert.deepEqual(names(), [
    "mds-color-brand-icon",
    "mds-color-brand-text",
    "mds-color-feedback-icon",
    "mds-color-feedback-text",
  ]);
  model.setNamespace("");
  assert.deepEqual(model.serializeState().namespaceEnabled, false);
  assert.equal(names()[0], "color-brand-icon");
});

test("inserting an axis adds it to every category, before scale in Tier 1", () => {
  model.loadProjectState({
    version: 3,
    tierMode: "tier1",
    axes: [
      { id: "category", name: "category", locked: true, slot: "category" },
      { id: "scale", name: "scale", locked: true, slot: "scale" },
    ],
    categories: [
      { id: "cat1", name: "color", dtcgType: "color", values: { scale: { groups: [ALL(list("100"))] } } },
      { id: "cat2", name: "space", dtcgType: "dimension", values: { scale: { groups: [ALL(list("4"))] } } },
    ],
  });
  const axId = model.insertAxis("Hue");
  const state = model.serializeState();
  assert.deepEqual(state.axes.map((a) => a.name), ["category", "hue", "scale"]);
  state.categories.forEach((c) => assert.ok(c.values[axId].groups.length === 1));
  assert.equal(model.insertAxis("hue"), null, "duplicate names are refused");
  assert.equal(model.insertAxis("category"), null, "reserved names are refused");
});

test("removing an axis lists the categories that have values on it first", () => {
  load();
  model.loadProjectState({
    ...model.serializeState(),
    categories: [
      ...model.serializeState().categories,
      { id: "cat2", name: "space", dtcgType: "dimension", values: { ax1: { unused: true, groups: [ALL(list("x"))] } } },
      { id: "cat3", name: "motion", dtcgType: "duration", values: {} },
    ],
  });
  // Values kept on an Unused axis are lost too, so they are listed.
  assert.deepEqual(model.categoriesWithValuesOn("ax1"), ["color", "space"]);
  assert.ok(model.removeAxis("ax1"));
  assert.deepEqual(names(), ["color-icon", "color-text"]);
  assert.equal(model.removeAxis("category"), false, "fixed axes can't be removed");
});

test("moving an axis earlier drops conditions that would point forward", () => {
  load({
    ax2: {
      groups: [
        ALL(list("text", "icon")),
        { id: "g1", condition: { ax1: ["feedback"] }, generator: list("text") },
      ],
    },
  });
  assert.ok(model.moveAxis("ax2", -1));
  assert.deepEqual(model.serializeState().axes.map((a) => a.name), ["category", "role", "family"]);
  assert.equal(entry("ax2").groups.length, 1);
  assert.equal(names().length, 4);
  assert.equal(model.moveAxis("ax2", -1), false, "nothing moves before category");
});

test("a new conditional group with values replaces ALL where it matches", () => {
  load();
  const gid = model.addGroup("cat1", "ax2", { ax1: ["feedback"] });
  model.addGroupValue("cat1", "ax2", gid, "icon");
  assert.deepEqual(names(), ["color-brand-icon", "color-brand-text", "color-feedback-icon"]);
  assert.equal(model.addGroup("cat1", "ax2", {}), null, "a conditional group needs a condition");
  assert.equal(model.addGroup("cat1", "ax1", { ax2: ["text"] }), null, "conditions name earlier axes only");
});

test("toggling condition values edits the condition but never empties it", () => {
  load();
  const gid = model.addGroup("cat1", "ax2", { ax1: ["feedback"] });
  model.toggleConditionValue("cat1", "ax2", gid, "ax1", "brand");
  assert.deepEqual(entry("ax2").groups[1].condition, { ax1: ["feedback", "brand"] });
  model.toggleConditionValue("cat1", "ax2", gid, "ax1", "feedback");
  assert.equal(model.toggleConditionValue("cat1", "ax2", gid, "ax1", "brand"), false);
  assert.deepEqual(entry("ax2").groups[1].condition, { ax1: ["brand"] });
});

test("the condition popover offers every earlier axis in use, with its values", () => {
  load({
    ax2: {
      groups: [ALL(list("text", "[base]")), { id: "g1", condition: { ax1: ["brand"] }, generator: list("container") }],
    },
    ax3: { groups: [ALL(list("hover"))] },
  }, { axes: [...AXES, { id: "ax3", name: "state", locked: false, slot: "middle" }] });
  assert.deepEqual(model.conditionOptions("cat1", "ax3"), [
    { axId: "ax1", name: "family", values: ["brand", "feedback"] },
    { axId: "ax2", name: "role", values: ["text", "[base]", "container"] },
  ]);
  assert.equal(model.conditionSummary({ ax1: ["brand"], ax2: ["container", "text"] }), "brand · container/text");
});

test("removing a conditional group brings back ALL where it matched", () => {
  load({
    ax2: { groups: [ALL(list("text")), { id: "g1", condition: { ax1: ["brand"] }, generator: list("icon") }] },
  });
  assert.ok(model.removeGroup("cat1", "ax2", "g1"));
  assert.deepEqual(names(), ["color-brand-text", "color-feedback-text"]);
  assert.equal(model.removeGroup("cat1", "ax2", "gAll"), false, "ALL can't be removed");
});

test("group values can be renamed and removed", () => {
  load();
  assert.ok(model.renameGroupValue("cat1", "ax2", "gAll", 0, "[base]"));
  assert.ok(model.removeGroupValue("cat1", "ax1", "gAll", 1));
  assert.deepEqual(names(), ["color-brand", "color-brand-icon"]);
  assert.equal(model.renameGroupValue("cat1", "ax2", "gAll", 1, "[base]"), false, "no duplicates");
});

test("switching a group's generator keeps its settings and changes its values", () => {
  load();
  model.setGroupGenerator("cat1", "ax2", "gAll", "numeric");
  model.setGeneratorConfig("cat1", "ax2", "gAll", "end", "12");
  assert.deepEqual(names().filter((n) => n.startsWith("color-brand")), [
    "color-brand-12",
    "color-brand-4",
    "color-brand-8",
  ]);
  model.addGroupValue("cat1", "ax2", "gAll", "16");
  assert.deepEqual(entry("ax2").groups[0].generator.list, ["4", "8", "12", "16"]);
});

test("converting a generated range to a literal list keeps the same values", () => {
  load();
  model.setGroupGenerator("cat1", "ax2", "gAll", "tshirt");
  const before = names();
  assert.ok(model.convertToLiteralList("cat1", "ax2", "gAll"));
  const gen = entry("ax2").groups[0].generator;
  assert.equal(gen.type, "custom");
  assert.deepEqual(gen.list, ["xs", "sm", "md", "lg", "xl"]);
  assert.deepEqual(names(), before);
  assert.equal(model.convertToLiteralList("cat1", "ax2", "gAll"), false, "already a literal list");
  assert.equal(model.convertToLiteralList("cat1", "ax2", "nope"), false);
});

test("a group sets a token type only when its condition includes the first axis", () => {
  load({ ax3: { groups: [ALL(list("hover"))] } }, { axes: [...AXES, { id: "ax3", name: "state", locked: false, slot: "middle" }] });
  const onRole = model.addGroup("cat1", "ax3", { ax2: ["text"] });
  assert.equal(model.setGroupTokenType("cat1", "ax3", onRole, "dimension"), false);
  const onFamily = model.addGroup("cat1", "ax2", { ax1: ["brand"] });
  model.addGroupValue("cat1", "ax2", onFamily, "size");
  assert.ok(model.setGroupTokenType("cat1", "ax2", onFamily, "dimension"));
  const types = Object.fromEntries(model.allTokens().map((t) => [t.path.join("-"), t.type]));
  assert.equal(types["color-brand-size-hover"], "dimension");
  assert.equal(types["color-feedback-icon-hover"], "color");
});

test("an Unused axis is left out of this category's names only", () => {
  load();
  model.addCategory("space");
  const space = model.serializeState().categories.find((c) => c.name === "space");
  model.addGroupValue(space.id, "ax2", allGroupId(space, "ax2"), "inset");
  model.setAxisUnused("cat1", "ax1", true);
  assert.deepEqual(names(), ["color-icon", "color-text", "space-inset"]);
});

test("categories can be renamed, retyped and removed; names stay unique", () => {
  load();
  const id = model.addCategory("Font Size");
  assert.equal(model.addCategory("color"), null);
  assert.equal(model.renameCategory(id, "color"), false);
  assert.ok(model.renameCategory(id, "font-weight"));
  assert.ok(model.setCategoryType(id, "fontWeight"));
  assert.equal(model.setCategoryType(id, "colour"), false);
  const cat = model.serializeState().categories.find((c) => c.id === id);
  assert.deepEqual([cat.name, cat.dtcgType], ["font-weight", "fontWeight"]);
  assert.ok(model.removeCategory("cat1"));
  assert.deepEqual(model.serializeState().categories.map((c) => c.name), ["font-weight"]);
});

function allGroupId(category, axId) {
  return category.values[axId].groups.find((g) => !Object.keys(g.condition).length).id;
}

/* ── Moving an axis to any position (drag and drop) ──── */

// family, role and state, each with values; state has a group conditioned
// on family. Tier 1 adds a locked scale axis last.
function loadThree(tierMode = "tier2") {
  const axes = [
    { id: "category", name: "category", locked: true, slot: "category" },
    { id: "ax1", name: "family", locked: false, slot: "middle" },
    { id: "ax2", name: "role", locked: false, slot: "middle" },
    { id: "ax3", name: "state", locked: false, slot: "middle" },
  ];
  if (tierMode === "tier1") axes.push({ id: "scale", name: "scale", locked: true, slot: "scale" });
  const err = model.loadProjectState({
    version: 3,
    tierMode,
    axes,
    categories: [
      {
        id: "cat1",
        name: "color",
        dtcgType: "color",
        values: {
          ax1: { groups: [ALL(list("brand", "feedback"))] },
          ax2: { groups: [ALL(list("text"))] },
          ax3: {
            groups: [
              ALL(list("hover")),
              { id: "g1", condition: { ax1: ["feedback"] }, generator: list("active") },
            ],
          },
          ...(tierMode === "tier1" ? { scale: { groups: [ALL(list("100"))] } } : {}),
        },
      },
      {
        id: "cat2",
        name: "space",
        dtcgType: "dimension",
        values: {
          ax1: { groups: [ALL(list("inset"))] },
          ax2: { groups: [ALL(list("x"))] },
          ax3: { groups: [ALL(list("y"))] },
          ...(tierMode === "tier1" ? { scale: { groups: [ALL(list("4"))] } } : {}),
        },
      },
    ],
  });
  assert.equal(err, null);
}
const axisNames = () => model.serializeState().axes.map((a) => a.name);

test("moveAxisTo moves an axis several places at once", () => {
  loadThree();
  assert.ok(model.moveAxisTo("ax2", 3));
  assert.deepEqual(axisNames(), ["category", "family", "state", "role"]);
  assert.ok(names().includes("color-feedback-active-text"), "conditions that stay earlier are kept");
  assert.ok(model.moveAxisTo("ax2", 1));
  assert.deepEqual(axisNames(), ["category", "role", "family", "state"]);
  assert.ok(names().includes("color-text-feedback-active"));
});

test("moveAxisTo keeps axes after category, and before scale in Tier 1", () => {
  loadThree("tier1");
  assert.equal(model.canMoveAxisTo("ax1", 0), false, "nothing moves before category");
  assert.equal(model.canMoveAxisTo("ax1", 4), false, "nothing moves after scale in Tier 1");
  assert.equal(model.canMoveAxisTo("ax1", 1), false, "staying put is not a move");
  assert.equal(model.canMoveAxisTo("scale", 1), false, "scale is fixed in Tier 1");
  assert.equal(model.canMoveAxisTo("category", 2), false, "category is fixed");
  assert.equal(model.moveAxisTo("ax1", 4), false);
  assert.ok(model.moveAxisTo("ax1", 3));
  assert.deepEqual(axisNames(), ["category", "role", "state", "family", "scale"]);
});

test("conditionsLostByMove names the categories whose groups would lose part of a condition", () => {
  loadThree();
  assert.deepEqual(model.conditionsLostByMove("ax1", 2), [], "family still comes before state");
  assert.deepEqual(model.conditionsLostByMove("ax1", 3), ["color"]);
  assert.deepEqual(model.conditionsLostByMove("ax3", 1), ["color"]);
  assert.deepEqual(model.conditionsLostByMove("ax2", 1), []);
  assert.ok(model.moveAxisTo("ax3", 1));
  assert.equal(entry("ax3").groups.length, 1, "the group with no condition left is removed");
});

test("one-step moves still work and match canMoveAxis", () => {
  loadThree();
  assert.equal(model.canMoveAxis("ax1", -1), false);
  assert.ok(model.canMoveAxis("ax1", 1));
  assert.ok(model.moveAxis("ax1", 1));
  assert.deepEqual(axisNames(), ["category", "role", "family", "state"]);
});
