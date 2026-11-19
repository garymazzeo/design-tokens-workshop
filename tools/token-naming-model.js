/*
 * Token Naming Builder — model.
 *
 * The project state (axes, categories, namespace, tier) and everything that
 * works on it without a DOM: value generation, token-name generation,
 * migration/validation/loading of project files, and the CSS, tokens.json
 * and Markdown exports.
 *
 * Loaded as a classic script by tools/token-naming-builder.html, so the
 * builder's inline script shares these top-level bindings and the page still
 * works when opened straight from disk. Node loads the same file as CommonJS
 * (see the export at the bottom), which is how scripts/check-naming-parity.mjs
 * and tests/ run the model without a browser.
 *
 * Terms (axis, group, condition, unused axis, …) are defined in CONTEXT.md.
 * In each category, each configurable axis holds an axis entry:
 *   { unused?: true, groups: Group[] }
 *   Group = { id, condition: { [axisId]: string[] }, generator, tokenType? }
 * Exactly one group per axis is the ALL group, whose condition is empty.
 */

/* ── State ──────────────────────────────────────────── */
const DEFAULT_PROJECT_TITLE_T1 = "Tier 1 Tokens";
const DEFAULT_PROJECT_TITLE_T2 = "Tier 2 Tokens";
let tierMode = "tier1"; // "tier1" | "tier2"
let projectTitle = DEFAULT_PROJECT_TITLE_T1;
let namespaceEnabled = false;
let namespaceValue = "";
let axes = [
  { id: "category", name: "category", locked: true, slot: "category" },
  { id: "scale", name: "scale", locked: true, slot: "scale" },
];
let categories = []; // {id, name, dtcgType, values: {axisId: axis entry}}
let axisSeq = 0,
  catSeq = 0,
  groupSeq = 0;

const RESERVED_AXIS_NAMES = new Set(["category", "namespace"]);

const DTCG_FUNDAMENTAL_TYPES = [
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "number",
];
const DTCG_COMPOSITE_TYPES = [
  "strokeStyle",
  "border",
  "transition",
  "shadow",
  "gradient",
  "typography",
];
const TERRAZZO_EXTENSION_TYPES = ["link", "boolean", "string"];
const DTCG_TYPES = new Set([
  ...DTCG_FUNDAMENTAL_TYPES,
  ...DTCG_COMPOSITE_TYPES,
  ...TERRAZZO_EXTENSION_TYPES,
]);
const DTCG_LEAF_DESCRIPTION = "Naming placeholder — value TBD";

const TIER1_PRESETS = new Set(["basic", "full", "families"]);
const TIER2_PRESETS = new Set(["semantic-color", "typography-compound"]);

function defaultTitleForTier(mode) {
  return mode === "tier2"
    ? DEFAULT_PROJECT_TITLE_T2
    : DEFAULT_PROJECT_TITLE_T1;
}

function isDefaultProjectTitle(title) {
  return (
    title === DEFAULT_PROJECT_TITLE_T1 ||
    title === DEFAULT_PROJECT_TITLE_T2
  );
}

/* ── Axes ─────────────────────────────────────────── */
// Namespace and category are fixed positions in the formula; every other axis
// is configured per category.
function isConfigurableAxis(ax) {
  return ax.slot !== "namespace" && ax.slot !== "category";
}

function scaleAxisIndex() {
  return axes.findIndex((a) => a.slot === "scale");
}

function categoryAxisIndex() {
  return axes.findIndex((a) => a.slot === "category");
}

function axisIndexById(axId) {
  return axes.findIndex((a) => a.id === axId);
}

function firstConfigurableAxisIndex() {
  return axes.findIndex(isConfigurableAxis);
}

// The axis right after category: only groups whose condition includes it may
// set a token type.
function typeAxis() {
  return axes[firstConfigurableAxisIndex()] || null;
}

// Tier 1 keeps a locked scale axis last; Tier 2 treats scale as an ordinary
// axis. Moves and relabels the scale axis to match tierMode.
function syncScaleAxisSlots() {
  if (tierMode === "tier2") {
    axes.forEach((a) => {
      if (a.slot === "scale") {
        a.slot = "middle";
        a.locked = false;
      }
    });
    return;
  }

  let scaleAx = axes.find((a) => a.slot === "scale");
  if (!scaleAx) {
    scaleAx = axes.find((a) => a.name === "scale" && a.slot === "middle");
  }
  if (!scaleAx) {
    scaleAx = {
      id: "scale",
      name: "scale",
      locked: true,
      slot: "scale",
    };
    axes.push(scaleAx);
  } else {
    scaleAx.slot = "scale";
    scaleAx.locked = true;
    scaleAx.name = "scale";
  }
  axes = axes.filter((a) => a.id !== scaleAx.id);
  axes.push(scaleAx);
}

function syncScaleAxisForTier() {
  syncScaleAxisSlots();
  categories.forEach(normalizeCategory);
}

const SCALE_TYPES = {
  unused: { label: "Unused", desc: "Skip this axis for this category" },
  numeric: { label: "Numeric range", desc: "e.g. 4, 8, 12, 16…" },
  ordinal: { label: "Ordinal (100–900)", desc: "e.g. 100, 200…900" },
  tshirt: { label: "T-shirt sizes", desc: "e.g. xs, sm, md, lg, xl" },
  custom: { label: "Custom list", desc: "comma-separated values; use [default], [base], etc. to omit that segment from the name" },
};
const GENERATOR_TYPES = new Set(["numeric", "ordinal", "tshirt", "custom"]);
const TSHIRT_BASE = ["xs", "sm", "md", "lg", "xl"];

/* ── Groups ───────────────────────────────────────── */
function mkGenerator(list) {
  return { type: "custom", config: {}, list: list ? list.slice() : [] };
}

function mkGroup(condition, generator) {
  return { id: "g" + ++groupSeq, condition: condition || {}, generator: generator || mkGenerator() };
}

function mkAxisEntry() {
  return { groups: [mkGroup({}, mkGenerator())] };
}

function isAllGroup(group) {
  return !group.condition || !Object.keys(group.condition).length;
}

function allGroup(entry) {
  return entry.groups.find(isAllGroup);
}

function conditionalGroups(entry) {
  return entry.groups.filter((g) => !isAllGroup(g));
}

// chosen maps axis id → the raw value (e.g. "[default]") picked on that axis
// for the token name so far.
function groupMatches(group, chosen) {
  return Object.entries(group.condition).every(
    ([axId, vals]) => Object.prototype.hasOwnProperty.call(chosen, axId) && vals.includes(chosen[axId]),
  );
}

// The latest axis in the formula that a group's condition names.
function deepestConditionAxisId(group) {
  return Object.keys(group.condition).reduce((best, axId) =>
    best == null || axisIndexById(axId) > axisIndexById(best) ? axId : best,
  null);
}

function groupValues(groups) {
  return [...new Set(groups.flatMap((g) => genValues(g.generator)))];
}

function initCategoryValues(c) {
  axes.forEach((ax) => {
    if (isConfigurableAxis(ax) && !c.values[ax.id]) c.values[ax.id] = mkAxisEntry();
  });
}

// Brings a loaded or edited category back in line with the current axes: one
// entry per configurable axis, exactly one ALL group (listed first), and
// conditions that only name earlier axes. Conditional groups left with no
// condition (their axes were removed or moved later) are dropped, and so is a
// token type whose condition no longer includes the axis right after category.
function normalizeCategory(c) {
  if (!c.values || typeof c.values !== "object") c.values = {};
  if (typeof c.dtcgType !== "string" || !DTCG_TYPES.has(c.dtcgType)) {
    c.dtcgType = "";
  }
  const configurable = new Set(axes.filter(isConfigurableAxis).map((a) => a.id));
  Object.keys(c.values).forEach((k) => {
    if (!configurable.has(k)) delete c.values[k];
  });
  const firstAx = typeAxis();
  axes.forEach((ax, idx) => {
    if (!isConfigurableAxis(ax)) return;
    let entry = c.values[ax.id];
    if (!entry || !Array.isArray(entry.groups)) entry = c.values[ax.id] = mkAxisEntry();
    if (entry.unused) entry.unused = true; // stored as true or left out
    else delete entry.unused;
    const earlier = new Set(
      axes.slice(0, idx).filter(isConfigurableAxis).map((a) => a.id),
    );
    const all = entry.groups.find(isAllGroup) || mkGroup({}, mkGenerator());
    const conditional = entry.groups.filter((g) => g !== all && !isAllGroup(g));
    conditional.forEach((g) => {
      g.condition = Object.fromEntries(
        Object.entries(g.condition).filter(
          ([axId, vals]) => earlier.has(axId) && Array.isArray(vals) && vals.length,
        ),
      );
    });
    delete all.tokenType;
    // Conditional groups whose every condition was pruned are dropped.
    entry.groups = [all, ...conditional.filter((g) => !isAllGroup(g))];
    entry.groups.forEach((g) => {
      if (!g.generator || !GENERATOR_TYPES.has(g.generator.type)) g.generator = mkGenerator();
      if (
        g.tokenType &&
        (!DTCG_TYPES.has(g.tokenType) || !firstAx || !(firstAx.id in g.condition))
      ) {
        delete g.tokenType;
      }
      if (g.tokenType === "") delete g.tokenType;
    });
  });
}

function hasConditionalGroups() {
  return categories.some((c) =>
    Object.values(c.values).some((entry) => conditionalGroups(entry).length),
  );
}

/* ── Value generation ─────────────────────────────── */
function genValues(generator) {
  const cfg = generator.config || {};
  switch (generator.type) {
    case "numeric": {
      const start = parseFloat(cfg.start ?? 4),
        end = parseFloat(cfg.end ?? 64),
        step = parseFloat(cfg.step ?? 4);
      const out = [];
      if (step > 0)
        for (let v = start; v <= end + 1e-9; v += step)
          out.push(String(Math.round(v * 100) / 100));
      return out;
    }
    case "ordinal": {
      const start = parseInt(cfg.start ?? 100),
        end = parseInt(cfg.end ?? 900),
        step = parseInt(cfg.step ?? 100);
      const out = [];
      if (step > 0)
        for (let v = start; v <= end; v += step) out.push(String(v));
      return out;
    }
    case "tshirt": {
      const extra = normalizeTshirtExtra(cfg.extra ?? 0);
      const extrasBelow = [];
      const extrasAbove = [];
      for (let i = extra; i >= 2; i--) extrasBelow.push(i + "xs");
      for (let i = 2; i <= extra; i++) extrasAbove.push(i + "xl");
      return [...extrasBelow, ...TSHIRT_BASE, ...extrasAbove];
    }
    case "unused":
      return [];
    case "custom":
    default:
      return generator.list && generator.list.length ? generator.list : [];
  }
}

function parseCustomList(str) {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const OMITTED_AXIS_VALUE_RE = /^\[[^\]]+\]$/;

function isOmittedAxisValue(val) {
  return OMITTED_AXIS_VALUE_RE.test(String(val).trim());
}

function tokenPart(val) {
  return isOmittedAxisValue(val) ? "" : val;
}

function joinTokenParts(parts) {
  return parts.filter(Boolean).join("-");
}

function normalizeTshirtExtra(val) {
  const n = parseInt(val, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n === 1) return 2;
  return n;
}

/* ── Token generation ─────────────────────────────── */
// Every token in a category as a list of named segments ({ax, val, dtcgType?}),
// leaving out namespace, category and omitted values. At each axis the values
// come from the conditional groups matching the token name so far, or from
// ALL when none match. An axis that is unused, or has no values, adds nothing.
//
// A matching group with a token type gives that type to the segment of the
// latest axis its condition names; the token takes the type of its latest
// typed segment (see allTokens).
function tokenSegmentPaths(category) {
  const out = [];
  (function walk(axisIdx, segments, chosen, types) {
    if (axisIdx >= axes.length) {
      if (segments.length) {
        out.push(
          segments.map((s) => (types[s.ax.id] ? { ...s, dtcgType: types[s.ax.id] } : s)),
        );
      }
      return;
    }
    const ax = axes[axisIdx];
    const entry = isConfigurableAxis(ax) ? category.values[ax.id] : null;
    if (!entry || entry.unused) {
      walk(axisIdx + 1, segments, chosen, types);
      return;
    }
    const matched = conditionalGroups(entry).filter((g) => groupMatches(g, chosen));
    let nextTypes = types;
    matched.forEach((g) => {
      if (g.tokenType && DTCG_TYPES.has(g.tokenType)) {
        nextTypes = { ...nextTypes, [deepestConditionAxisId(g)]: g.tokenType };
      }
    });
    const vals = groupValues(matched.length ? matched : [allGroup(entry)]);
    if (!vals.length) {
      walk(axisIdx + 1, segments, chosen, nextTypes);
      return;
    }
    for (const raw of vals) {
      const seg = tokenPart(raw);
      walk(
        axisIdx + 1,
        seg ? [...segments, { ax, val: seg }] : segments,
        { ...chosen, [ax.id]: raw },
        nextTypes,
      );
    }
  })(0, [], {}, {});
  return out;
}

// For each axis that appears in the category's names: the axis and every
// named value it can take, across all its groups.
function getActiveAxisData(category) {
  const parts = [];
  if (namespaceEnabled && namespaceValue) {
    parts.push({
      ax: axes.find((a) => a.slot === "namespace") || {
        slot: "namespace",
        name: "namespace",
      },
      vals: [namespaceValue],
    });
  }
  parts.push({
    ax: axes.find((a) => a.slot === "category") || {
      slot: "category",
      name: "category",
    },
    vals: [category.name],
  });
  axes.forEach((ax) => {
    if (!isConfigurableAxis(ax)) return;
    const entry = category.values[ax.id];
    if (!entry || entry.unused) return;
    const vals = groupValues(entry.groups).filter((v) => !isOmittedAxisValue(v));
    if (vals.length) parts.push({ ax, vals });
  });
  return parts;
}

function allTokensForCategory(category) {
  const prefix = [];
  if (namespaceEnabled && namespaceValue) prefix.push(namespaceValue);
  prefix.push(category.name);
  return tokenSegmentPaths(category).map((segments) =>
    joinTokenParts([...prefix, ...segments.map((segment) => segment.val)]),
  );
}

function tokenPathCollisions(category) {
  const seen = new Set();
  const collisions = new Set();
  tokenSegmentPaths(category).forEach((segments) => {
    const name = joinTokenParts(segments.map((segment) => segment.val));
    if (seen.has(name)) collisions.add(name);
    seen.add(name);
  });
  return [...collisions];
}

function buildCssExport() {
  const tierLabel =
    tierMode === "tier2" ? "Tier 2" : "Tier 1";
  let out = `/* ${tierLabel} token names only — values added elsewhere */\n:root {\n`;
  categories.forEach((c) => {
    allTokensForCategory(c).forEach((token) => {
      out += `  --${token}: ;\n`;
    });
  });
  out += "}\n";
  return out;
}

function dtcgHasNonMetaKeys(obj) {
  return Object.keys(obj).some((k) => !k.startsWith("$"));
}

function applyDtcgLeafPlaceholders(node) {
  node.$description = DTCG_LEAF_DESCRIPTION;
  node.$value = "";
}

function clearDtcgLeafPlaceholders(node) {
  delete node.$description;
  delete node.$value;
}

function dtcgEnsurePath(root, parts) {
  if (!parts.length) {
    applyDtcgLeafPlaceholders(root);
    return;
  }
  let node = root;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    const isLeaf = i === parts.length - 1;
    if (!node[key]) {
      node[key] = {};
      if (isLeaf) applyDtcgLeafPlaceholders(node[key]);
    } else if (isLeaf) {
      if (!dtcgHasNonMetaKeys(node[key])) {
        applyDtcgLeafPlaceholders(node[key]);
      }
    } else if (!dtcgHasNonMetaKeys(node[key])) {
      clearDtcgLeafPlaceholders(node[key]);
    }
    node = node[key];
  }
}

function dtcgApplySegmentTypes(root, segments) {
  let node = root;
  segments.forEach((segment) => {
    if (!segment.val) return;
    node = node[segment.val];
    if (segment.dtcgType && DTCG_TYPES.has(segment.dtcgType)) {
      node.$type = segment.dtcgType;
    }
  });
}

function buildDtcgExport() {
  const tierLabel =
    tierMode === "tier2" ? "Tier 2 · Semantic" : "Tier 1 · Primitive";
  const root = {
    $description: `Naming convention export (${tierLabel}) — values TBD`,
  };

  let nestRoot = root;
  if (namespaceEnabled && namespaceValue) {
    root[namespaceValue] = {};
    nestRoot = root[namespaceValue];
  }

  categories.forEach((c) => {
    const group = {};
    if (c.dtcgType && DTCG_TYPES.has(c.dtcgType)) {
      group.$type = c.dtcgType;
    }

    const paths = tokenSegmentPaths(c);
    if (!paths.length) {
      applyDtcgLeafPlaceholders(group);
    } else {
      paths.forEach((segs) => {
        dtcgEnsurePath(group, segs.map((s) => s.val));
        dtcgApplySegmentTypes(group, segs);
      });
    }

    nestRoot[c.name] = group;
  });

  return JSON.stringify(root, null, 2) + "\n";
}

/* ── Export ────────────────────────────────────────── */
function buildExport() {
  const tierLabel =
    tierMode === "tier2" ? "Tier 2 · Semantic" : "Tier 1 · Primitive";
  let out = "";
  out += `# ${tierLabel} Naming Convention\n\n`;
  out += "## Axes\n\n";
  out += axes
    .map((a, i) => {
      let note = "";
      if (a.slot === "namespace") note = " (optional)";
      else if (a.slot === "category") note = " (required)";
      else if (a.slot === "scale") note = " (required — final axis)";
      else if (a.name === "scale" && tierMode === "tier2")
        note = " (optional)";
      return `${i + 1}. **${a.name}**${note}`;
    })
    .join("\n");
  out += "\n\n";
  out +=
    "## Formula\n\n```\n" +
    axes.map((a) => `[${a.name}]`).join("-") +
    "\n```\n\n";

  if (namespaceEnabled) {
    out += "## Namespace\n\n";
    out += namespaceValue
      ? `**${namespaceValue}** (global — applies to all tokens)\n\n`
      : "_Not set — enter a value in Step 1._\n\n";
  }

  if (!categories.length) {
    out += "_No categories defined yet._\n";
  } else {
    out += "## Categories\n\n";
    categories.forEach((c) => {
      out += `### ${c.name}\n\n`;
      out += `- **Token type**: ${c.dtcgType ? `\`${c.dtcgType}\`` : "_not set_"}\n`;
      out += exportAxisValues(c);
      out += "\n";
    });
  }

  out +=
    "---\n\n*Generated with the Tier 1/2 Naming Builder — Design System Workshop*\n";
  return out;
}

function describeCondition(condition) {
  return Object.entries(condition)
    .map(([axId, vals]) => {
      const ax = axes.find((a) => a.id === axId);
      return `${ax ? ax.name : axId} = ${vals.join(" or ")}`;
    })
    .join(" and ");
}

function describeGenerator(generator) {
  const vals = genValues(generator);
  const typeLbl = SCALE_TYPES[generator.type]?.label || generator.type;
  return `(${typeLbl}): ${vals.length ? vals.join(", ") : "_none_"}`;
}

function exportAxisValues(category) {
  let out = "";
  axes.forEach((ax) => {
    if (!isConfigurableAxis(ax)) return;
    const entry = category.values[ax.id];
    if (!entry) return;
    if (entry.unused) {
      out += `- **${ax.name}** (Unused): _skipped_\n`;
      return;
    }
    out += `- **${ax.name}** ${describeGenerator(allGroup(entry).generator)}\n`;
    conditionalGroups(entry).forEach((g) => {
      const type = g.tokenType ? ` · token type \`${g.tokenType}\`` : "";
      out += `  - when ${describeCondition(g.condition)} ${describeGenerator(g.generator)}${type}\n`;
    });
  });
  return out;
}

/* ── Project files ────────────────────────────────── */
const STATE_VERSION = 3;

function serializeState() {
  return {
    version: STATE_VERSION,
    tierMode,
    projectTitle,
    namespaceEnabled,
    namespaceValue,
    axes: JSON.parse(JSON.stringify(axes)),
    categories: JSON.parse(JSON.stringify(categories)),
    axisSeq,
    catSeq,
    groupSeq,
  };
}

// The highest n among ids shaped like prefix + n (e.g. "ax3", "g12"), or 0.
function maxSeq(ids, prefix) {
  const re = new RegExp("^" + prefix + "(\\d+)$");
  return ids.reduce((max, id) => {
    const m = re.exec(id);
    return m ? Math.max(max, +m[1]) : max;
  }, 0);
}

function allGroupIds() {
  return categories.flatMap((c) =>
    Object.values(c.values).flatMap((entry) => (entry.groups || []).map((g) => g.id)),
  );
}

function recomputeSeqCounters() {
  axisSeq = maxSeq(axes.map((a) => a.id), "ax");
  catSeq = maxSeq(categories.map((c) => c.id), "cat");
  groupSeq = maxSeq(allGroupIds(), "g");
}

function migrateState(data) {
  if (!data || typeof data !== "object") return data;
  const migrated = JSON.parse(JSON.stringify(data));
  if (migrated.version === 1) {
    migrated.version = 2;
    if (migrated.tierMode !== "tier1" && migrated.tierMode !== "tier2") {
      migrated.tierMode = "tier1";
    }
    if (Array.isArray(migrated.categories)) {
      migrated.categories.forEach((c) => {
        if (typeof c.dtcgType !== "string") c.dtcgType = "";
      });
    }
  }
  return migrated;
}

const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);

// Checks one category's axis entries against a list of axes (in formula
// order). Axes the category doesn't mention are fine; loading fills them in.
function validateCategoryGroups(c, axisList) {
  const cat = c.name || "?";
  const values = c.values || {};
  if (!isPlainObject(values)) return `Category "${cat}" has invalid axis values.`;
  const configurable = axisList.filter(isConfigurableAxis);
  const firstAx = configurable[0];
  for (const [idx, ax] of configurable.entries()) {
    const entry = values[ax.id];
    if (entry == null) continue;
    const where = `axis "${ax.name}" in category "${cat}"`;
    if (!isPlainObject(entry) || !Array.isArray(entry.groups))
      return `The ${where} has no groups.`;
    const earlier = new Set(configurable.slice(0, idx).map((a) => a.id));
    let allCount = 0;
    for (const g of entry.groups) {
      if (!isPlainObject(g)) return `A group on the ${where} is invalid.`;
      if (g.condition != null && !isPlainObject(g.condition))
        return `A group on the ${where} has an invalid condition.`;
      const cond = g.condition || {};
      const condAxes = Object.keys(cond);
      if (!condAxes.length) allCount++;
      for (const axId of condAxes) {
        if (!earlier.has(axId)) {
          const named = axisList.find((a) => a.id === axId);
          return `A group on the ${where} has a condition on "${named ? named.name : axId}", which is not an earlier axis.`;
        }
        const vals = cond[axId];
        if (!Array.isArray(vals) || !vals.length || vals.some((v) => typeof v !== "string"))
          return `A group on the ${where} has a condition with no values.`;
      }
      if (!isPlainObject(g.generator) || !GENERATOR_TYPES.has(g.generator.type))
        return `A group on the ${where} has an unknown value generator.`;
      if (g.tokenType != null && g.tokenType !== "") {
        if (!DTCG_TYPES.has(g.tokenType))
          return `Unknown token type "${g.tokenType}" on the ${where}.`;
        if (!condAxes.includes(firstAx.id))
          return `A group on the ${where} sets a token type, but its condition doesn't include "${firstAx.name}", the axis right after category.`;
      }
    }
    if (allCount !== 1)
      return `The ${where} must have exactly one ALL group (found ${allCount}).`;
  }
  return null;
}

function validateState(data) {
  if (!data || typeof data !== "object") return "Invalid project data.";
  if (data.version !== 1 && data.version !== 2 && data.version !== STATE_VERSION)
    return `Incompatible file version — expected version 1 to ${STATE_VERSION}.`;
  if (data.tierMode != null && data.tierMode !== "tier1" && data.tierMode !== "tier2")
    return "Invalid tier mode.";
  if (!Array.isArray(data.axes) || data.axes.length < 1)
    return "Project is missing axis definitions.";
  if (!data.axes.some((a) => a.slot === "category"))
    return "Project must include a category axis.";
  const mode = data.tierMode === "tier2" ? "tier2" : "tier1";
  if (
    mode === "tier1" &&
    !data.axes.some((a) => a.slot === "scale" || a.name === "scale")
  )
    return "Project must include a scale axis.";
  if (
    data.namespaceEnabled &&
    !data.axes.some((a) => a.slot === "namespace")
  )
    return "Project has namespace enabled but no namespace axis.";
  if (!Array.isArray(data.categories))
    return "Project is missing categories.";
  for (const c of data.categories) {
    if (!isPlainObject(c)) return "Project has an invalid category.";
    if (
      c.dtcgType != null &&
      c.dtcgType !== "" &&
      !DTCG_TYPES.has(c.dtcgType)
    )
      return `Unknown token type "${c.dtcgType}" in category "${c.name || "?"}".`;
    if (data.version === STATE_VERSION) {
      const err = validateCategoryGroups(c, data.axes);
      if (err) return err;
    }
  }
  return null;
}

/* ── Loading ───────────────────────────────────────── */
// Migrates, validates and loads a project file into the model state. Files
// older than STATE_VERSION are converted to groups on the way in (see the
// legacy section below). Returns an error message, or null when the project
// loaded; on error the previous state is kept.
function loadProjectState(data) {
  const migrated = migrateState(data);
  const err = validateState(migrated);
  if (err) return err;
  const previous = serializeState();
  tierMode = migrated.tierMode === "tier2" ? "tier2" : "tier1";
  namespaceEnabled = !!migrated.namespaceEnabled;
  namespaceValue = String(migrated.namespaceValue || "");
  projectTitle =
    String(migrated.projectTitle || defaultTitleForTier(tierMode)).trim() ||
    defaultTitleForTier(tierMode);
  axes = JSON.parse(JSON.stringify(migrated.axes));
  categories = JSON.parse(JSON.stringify(migrated.categories));
  categories.forEach((c) => {
    if (!isPlainObject(c.values)) c.values = {};
  });
  groupSeq = 0;
  let loadErr = null;
  if (migrated.version < STATE_VERSION) {
    loadErr = convertLegacyProject();
  } else {
    // Groups that normalising adds must not reuse an id from the file.
    groupSeq = maxSeq(allGroupIds(), "g");
    syncScaleAxisForTier();
  }
  loadErr =
    loadErr ||
    categories.map((c) => validateCategoryGroups(c, axes)).find(Boolean) ||
    null;
  if (loadErr) {
    loadProjectState(previous);
    return loadErr;
  }
  recomputeSeqCounters();
  if (typeof migrated.axisSeq === "number")
    axisSeq = Math.max(axisSeq, migrated.axisSeq);
  if (typeof migrated.catSeq === "number")
    catSeq = Math.max(catSeq, migrated.catSeq);
  if (typeof migrated.groupSeq === "number")
    groupSeq = Math.max(groupSeq, migrated.groupSeq);
  return null;
}

// Every token in the project, in export order: its tokens.json path (namespace
// and category first, omitted values left out) and the token type it gets,
// which is the type of its latest typed segment, else the category's type.
function allTokens() {
  const prefix = namespaceEnabled && namespaceValue ? [namespaceValue] : [];
  return categories.flatMap((c) =>
    tokenSegmentPaths(c).map((segments) => {
      const typed = segments.filter((s) => DTCG_TYPES.has(s.dtcgType));
      const type = typed.length ? typed[typed.length - 1].dtcgType : c.dtcgType;
      return {
        path: [...prefix, c.name, ...segments.map((s) => s.val)],
        type: type || "",
      };
    }),
  );
}

// Every token name in the project, as written in the CSS export.
function allTokenNames() {
  return categories.flatMap((c) => allTokensForCategory(c));
}

/* ── Legacy project files (version 1 and 2) ──────────────────────────────
 * Before groups, an axis value was either flat ({type, config, list}) or
 * branched ({mode: "branched", branches: [{id, value, dtcgType, values}]}),
 * where each branch held its own values for every later axis. A values map
 * could also hold _combinationConfig: generated rules (multi-select blocks
 * whose combinations were all made) and explicit combinations (exact paths).
 * Version 1 files could also store a category in "families" mode.
 *
 * These functions only run while loading such a file: they normalise and
 * validate it the way the old builder did, then convert it to groups.
 */
function convertLegacyProject() {
  categories.forEach(legacyNormalizeCategory);
  syncScaleAxisSlots();
  categories.forEach(legacyNormalizeCategory);
  for (const c of categories) {
    const err = legacyValidateValues(c.values, c.name, firstConfigurableAxisIndex(), []);
    if (err) return err;
  }
  categories.forEach((c) => {
    c.values = convertLegacyValues(c.values);
    delete c.mode;
    delete c.families;
    normalizeCategory(c);
  });
  return null;
}

function legacyIsBranched(av) {
  return !!av && av.mode === "branched";
}

function legacyShadowSubsequentAxes(values, branchedAxId) {
  axes.slice(axisIndexById(branchedAxId) + 1).filter(isConfigurableAxis).forEach((ax) => {
    values[ax.id] = { type: "unused", config: {}, list: [] };
  });
}

function legacyNormalizeValuesScope(values, startAxisIdx) {
  Object.keys(values).forEach((key) => {
    const idx = axisIndexById(key);
    if (idx >= 0 && isConfigurableAxis(axes[idx]) && idx < startAxisIdx) delete values[key];
  });
  for (let i = startAxisIdx; i < axes.length; i++) {
    const ax = axes[i];
    if (!isConfigurableAxis(ax)) continue;
    if (!values[ax.id]) values[ax.id] = mkGenerator();
    const av = values[ax.id];
    if (legacyIsBranched(av)) {
      legacyShadowSubsequentAxes(values, ax.id);
      av.branches.forEach((br) => {
        if (!br.values) br.values = {};
        legacyNormalizeValuesScope(br.values, i + 1);
      });
      break;
    }
  }
}

function legacyMigrateFamiliesMode(c) {
  if (c.mode !== "families" || !Array.isArray(c.families) || !c.families.length)
    return;
  let familyAx =
    axes.find((a) => a.slot === "middle" && a.name === "family") ||
    axes.find((a) => a.slot === "middle");
  if (!familyAx) {
    const insertAt = scaleAxisIndex();
    familyAx = {
      id: "ax" + (maxSeq(axes.map((a) => a.id), "ax") + 1),
      name: "family",
      locked: false,
      slot: "middle",
    };
    axes.splice(insertAt < 0 ? axes.length : insertAt, 0, familyAx);
  }
  c.values[familyAx.id] = {
    mode: "branched",
    branches: c.families.map((f) => ({
      value: f.name,
      values: { scale: f.scale || mkGenerator() },
    })),
  };
  legacyShadowSubsequentAxes(c.values, familyAx.id);
}

function legacyNormalizeCategory(c) {
  if (typeof c.dtcgType !== "string" || !DTCG_TYPES.has(c.dtcgType)) {
    c.dtcgType = "";
  }
  legacyMigrateFamiliesMode(c);
  delete c.mode;
  delete c.families;
  legacyNormalizeValuesScope(c.values, firstConfigurableAxisIndex());
}

// The axes a combination scope ranges over, with their values; null when the
// scope contains a branched axis (its combination rules were then ignored).
function legacyCombinationAxes(values, startAxisIdx) {
  const out = [];
  for (let i = startAxisIdx; i < axes.length; i++) {
    const ax = axes[i];
    if (!isConfigurableAxis(ax)) continue;
    const av = values[ax.id];
    if (!av || av.type === "unused") continue;
    if (legacyIsBranched(av)) return null;
    out.push({ ax, values: genValues(av).filter(Boolean) });
  }
  return out;
}

function legacyValidateValues(values, categoryName, startAxisIdx, branchPath) {
  const cfg = values._combinationConfig;
  if (cfg) {
    const defs = legacyCombinationAxes(values, startAxisIdx);
    if (!defs) return "Combination rules cannot contain a branched axis; configure rules inside that branch instead.";
    for (const [ruleIdx, rule] of (cfg.rules || []).entries()) {
      for (const { ax, values: options } of defs) {
        const selected = rule.selections && rule.selections[ax.id];
        if (!Array.isArray(selected) || !selected.length)
          return `Generated rule ${ruleIdx + 1} in category "${categoryName}" is missing values for axis "${ax.name}".`;
        if (selected.some((value) => !options.includes(value)))
          return `Generated rule ${ruleIdx + 1} in category "${categoryName}" contains a value not defined on axis "${ax.name}".`;
      }
    }
    for (const [additionIdx, addition] of (cfg.additions || []).entries()) {
      for (const { ax, values: options } of defs) {
        if (!options.includes(addition[ax.id]))
          return `Explicit combination ${additionIdx + 1} in category "${categoryName}" contains a value not defined on axis "${ax.name}".`;
      }
    }
  }
  for (let i = startAxisIdx; i < axes.length; i++) {
    const ax = axes[i];
    if (!isConfigurableAxis(ax)) continue;
    const av = values[ax.id];
    if (!legacyIsBranched(av)) continue;
    if (!Array.isArray(av.branches) || !av.branches.length)
      return `Branched axis "${ax.name}" in category "${categoryName}" has no branches.`;
    const names = new Set();
    for (const br of av.branches) {
      if (!br.value)
        return `A branch on "${ax.name}" in category "${categoryName}" is missing a value.`;
      if (names.has(br.value))
        return `Duplicate branch "${br.value}" on "${ax.name}" in category "${categoryName}".`;
      names.add(br.value);
      if (br.dtcgType != null && br.dtcgType !== "" && !DTCG_TYPES.has(br.dtcgType))
        return `Unknown token type "${br.dtcgType}" in category "${categoryName}" at subcategory path "${[...branchPath, br.value].join(" / ")}".`;
      const nested = legacyValidateValues(br.values || {}, categoryName, i + 1, [...branchPath, br.value]);
      if (nested) return nested;
    }
    break;
  }
  return null;
}

function legacyGenerator(av) {
  const gen = {
    type: GENERATOR_TYPES.has(av.type) ? av.type : "custom",
    config: { ...(av.config || {}) },
    list: Array.isArray(av.list) ? av.list.slice() : [],
  };
  if (av.listText != null) gen.listText = av.listText;
  return gen;
}

function conditionKey(condition) {
  return JSON.stringify(
    Object.keys(condition).sort().map((k) => [k, condition[k].slice().sort()]),
  );
}

// Converts one category's legacy values map to axis entries. Each branch and
// combination scope becomes conditional groups whose condition is the path of
// branch values (and, for combinations, the earlier values in the rule) that
// leads to it. The result makes exactly the same token names and types.
function convertLegacyValues(rootValues) {
  const out = {};
  axes.filter(isConfigurableAxis).forEach((ax) => (out[ax.id] = mkAxisEntry()));

  function emit(ax, condition, generator, unused) {
    const entry = out[ax.id];
    if (!Object.keys(condition).length) {
      if (unused) entry.unused = true;
      else allGroup(entry).generator = generator;
      return;
    }
    entry.groups.push(mkGroup(condition, unused ? mkGenerator() : generator));
  }

  const typedBranches = [];

  function convertScope(values, condition, startIdx) {
    const cfg = values._combinationConfig;
    const defs = cfg && legacyCombinationAxes(values, startIdx);
    if (defs) {
      convertCombinations(values, cfg, defs, condition, startIdx);
      return;
    }
    for (let i = startIdx; i < axes.length; i++) {
      const ax = axes[i];
      if (!isConfigurableAxis(ax)) continue;
      const av = values[ax.id];
      if (legacyIsBranched(av)) {
        emit(ax, condition, mkGenerator(av.branches.map((b) => b.value)));
        av.branches.forEach((br) => {
          const sub = { ...condition, [ax.id]: [br.value] };
          convertScope(br.values || {}, sub, i + 1);
          if (br.dtcgType) typedBranches.push({ condition: sub, fromIdx: i + 1, type: br.dtcgType });
        });
        return;
      }
      emit(ax, condition, av ? legacyGenerator(av) : mkGenerator(), !!av && av.type === "unused");
    }
  }

  // Every rule (and explicit combination) is a product of per-axis choices.
  // Axis j gets one group per distinct set of choices on the axes before it,
  // holding the union of the choices on axis j.
  function convertCombinations(values, cfg, defs, condition, startIdx) {
    const inDefs = new Set(defs.map((d) => d.ax.id));
    axes.slice(startIdx).forEach((ax) => {
      if (isConfigurableAxis(ax) && !inDefs.has(ax.id)) emit(ax, condition, mkGenerator(), true);
    });
    const rules = [
      ...(cfg.rules || []).map((r) => defs.map((d) => (r.selections && r.selections[d.ax.id]) || d.values)),
      ...(cfg.additions || []).map((a) => defs.map((d) => [a[d.ax.id]])),
    ];
    defs.forEach((d, j) => {
      const merged = new Map();
      rules.forEach((sel) => {
        const cond = { ...condition };
        for (let k = 0; k < j; k++) cond[defs[k].ax.id] = sel[k].slice();
        const key = conditionKey(cond);
        if (!merged.has(key)) merged.set(key, { cond, values: [] });
        const group = merged.get(key);
        sel[j].forEach((v) => {
          if (!group.values.includes(v)) group.values.push(v);
        });
      });
      if (!merged.size) emit(d.ax, condition, mkGenerator(), false);
      merged.forEach(({ cond, values: vals }) => emit(d.ax, cond, mkGenerator(vals), false));
    });
  }

  convertScope(rootValues, {}, firstConfigurableAxisIndex());

  // A branch's token type moves to the group on the next axis whose condition
  // ends with that branch. Groups may only set a type when their condition
  // includes the axis right after category, so for a branch deeper in the
  // formula the type goes on an extra group with no values whose condition
  // also lists every value that axis has today. It only ever matches where the
  // branch's own group does, so it changes no names, and the branch's values
  // don't depend on that list if the first axis is edited later.
  // Types that can't be expressed this way are dropped: a branch on the last
  // axis, or a deeper branch when the first axis is unused or has no values.
  const firstAx = typeAxis();
  typedBranches.forEach(({ condition, fromIdx, type }) => {
    const next = axes.slice(fromIdx).find(isConfigurableAxis);
    if (!next) return;
    const entry = out[next.id];
    const group = entry.groups.find(
      (g) => !isAllGroup(g) && conditionKey(g.condition) === conditionKey(condition),
    );
    if (!group) return;
    if (firstAx.id in condition) {
      group.tokenType = type;
      return;
    }
    const firstEntry = out[firstAx.id];
    const firstValues = firstEntry.unused ? [] : genValues(allGroup(firstEntry).generator);
    if (!firstValues.length) return;
    const typed = mkGroup({ [firstAx.id]: firstValues.slice(), ...condition }, mkGenerator());
    typed.tokenType = type;
    entry.groups.push(typed);
  });

  return out;
}

if (typeof module === "object" && module.exports) {
  module.exports = { loadProjectState, serializeState, allTokens, allTokenNames };
}
