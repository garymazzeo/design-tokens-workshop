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
 * runs the model without a browser.
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
let categories = []; // {id, name, dtcgType, values:{axisId: flat|branched}}; branches may have dtcgType
let axisSeq = 0,
  catSeq = 0,
  brSeq = 0;

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

function scaleAxisIndex() {
  return axes.findIndex((a) => a.slot === "scale");
}

function categoryAxisIndex() {
  return axes.findIndex((a) => a.slot === "category");
}

function syncScaleAxisForTier() {
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
  categories.forEach((c) => {
    normalizeCategory(c);
    initCategoryValues(c);
  });
}

function initCategoryValues(c) {
  axes.forEach((ax) => {
    if (ax.slot !== "category" && ax.slot !== "namespace") {
      if (!c.values[ax.id]) c.values[ax.id] = mkAxisVal();
    }
  });
}

const SCALE_TYPES = {
  unused: { label: "Unused", desc: "Skip this axis for this category" },
  numeric: { label: "Numeric range", desc: "e.g. 4, 8, 12, 16…" },
  ordinal: { label: "Ordinal (100–900)", desc: "e.g. 100, 200…900" },
  tshirt: { label: "T-shirt sizes", desc: "e.g. xs, sm, md, lg, xl" },
  custom: { label: "Custom list", desc: "comma-separated values; use [default], [base], etc. to omit that segment from the name" },
};
const TSHIRT_BASE = ["xs", "sm", "md", "lg", "xl"];

/* ── Category management ──────────────────────────── */
function mkAxisVal() {
  return { type: "custom", config: {}, list: [] };
}

function mkBranchId() {
  return "br" + ++brSeq;
}

function mkBranch(value) {
  return { id: mkBranchId(), value, dtcgType: "", values: {} };
}

function isBranched(av) {
  return av && av.mode === "branched";
}

function parseBranchPath(str) {
  return str ? String(str).split("|").filter(Boolean) : [];
}

function encodeBranchPath(path) {
  return path.length ? path.join("|") : "";
}

function axisIndexById(axId) {
  return axes.findIndex((a) => a.id === axId);
}

function configurableAxesFrom(startIdx) {
  return axes
    .slice(startIdx)
    .filter((a) => a.slot !== "namespace" && a.slot !== "category");
}

function initSubtreeValues(fromAxId) {
  const vals = {};
  const fromIdx = axisIndexById(fromAxId);
  configurableAxesFrom(fromIdx + 1).forEach((ax) => {
    vals[ax.id] = mkAxisVal();
  });
  return vals;
}

function mkCombinationConfig() {
  return { rules: [], additions: [] };
}

function combinationConfig(values) {
  return values && values._combinationConfig;
}

function combinationAxes(values, startAxisIdx) {
  const out = [];
  for (let i = startAxisIdx; i < axes.length; i++) {
    const ax = axes[i];
    if (ax.slot === "namespace" || ax.slot === "category") continue;
    const av = values[ax.id];
    if (!av || av.type === "unused") continue;
    if (isBranched(av)) return null;
    out.push({ ax, values: genValues(av).filter(Boolean) });
  }
  return out;
}

function combinationProduct(axisDefs, selections) {
  let paths = [[]];
  for (const def of axisDefs) {
    const selected = selections && Array.isArray(selections[def.ax.id])
      ? selections[def.ax.id]
      : def.values;
    if (!selected || !selected.length) return [];
    paths = paths.flatMap((prefix) =>
      selected.map((value) => [...prefix, { ax: def.ax, val: tokenPart(value) }]),
    );
  }
  return paths;
}

function constrainedTokenSegments(values, startAxisIdx) {
  const cfg = combinationConfig(values);
  const axisDefs = combinationAxes(values, startAxisIdx);
  if (!cfg || !axisDefs) return null;
  const out = [];
  (cfg.rules || []).forEach((rule) => {
    out.push(...combinationProduct(axisDefs, rule.selections || {}));
  });
  (cfg.additions || []).forEach((addition) => {
    const paths = combinationProduct(axisDefs, Object.fromEntries(
      axisDefs.map(({ ax }) => [ax.id, [addition[ax.id]]]),
    ));
    out.push(...paths);
  });
  const seen = new Set();
  return out.filter((segments) => {
    const key = segments.map((s) => `${s.ax.id}:${s.val}`).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scopeCombinationAxes(values, startAxisIdx) {
  const defs = combinationAxes(values, startAxisIdx);
  return defs && defs.length ? defs : [];
}

function combinationControlId(catId, branchPathStr, suffix) {
  return `combination-${catId}-${(branchPathStr || "root").replace(/\|/g, "-")}-${suffix}`;
}

function shadowSubsequentAxes(values, branchedAxId) {
  const fromIdx = axisIndexById(branchedAxId);
  configurableAxesFrom(fromIdx + 1).forEach((ax) => {
    values[ax.id] = { type: "unused", config: {}, list: [] };
  });
}

function getValuesMap(category, branchPath) {
  if (!branchPath.length) return category.values;
  let values = category.values;
  for (const brId of branchPath) {
    const found = findBranchInValues(values, brId);
    if (!found) return values;
    if (!found.branch.values) found.branch.values = {};
    values = found.branch.values;
  }
  return values;
}

function findBranchInValues(values, branchId) {
  for (const ax of axes) {
    if (ax.slot === "namespace" || ax.slot === "category") continue;
    const av = values[ax.id];
    if (isBranched(av)) {
      const br = av.branches.find((b) => b.id === branchId);
      if (br) return { ax, av, branch: br };
    }
  }
  return null;
}

function isShadowedAtLevel(values, axId) {
  const axIdx = axisIndexById(axId);
  for (let i = 0; i < axIdx; i++) {
    const earlier = axes[i];
    if (earlier.slot === "namespace" || earlier.slot === "category")
      continue;
    const av = values[earlier.id];
    if (isBranched(av)) return true;
  }
  return false;
}

function pruneValuesScope(values, startAxisIdx) {
  Object.keys(values).forEach((key) => {
    const ax = axes.find((a) => a.id === key);
    if (!ax) return;
    if (ax.slot === "namespace" || ax.slot === "category") return;
    if (axisIndexById(ax.id) < startAxisIdx) delete values[key];
  });
}

function normalizeValuesScope(values, startAxisIdx) {
  pruneValuesScope(values, startAxisIdx);
  for (let i = startAxisIdx; i < axes.length; i++) {
    const ax = axes[i];
    if (ax.slot === "namespace" || ax.slot === "category") continue;
    if (!values[ax.id]) values[ax.id] = mkAxisVal();
    const av = values[ax.id];
    if (isBranched(av)) {
      shadowSubsequentAxes(values, ax.id);
      av.branches.forEach((br) => {
        if (!br.values) br.values = {};
        normalizeValuesScope(br.values, i + 1);
      });
      break;
    }
  }
}

function migrateFamiliesMode(c) {
  if (c.mode !== "families" || !Array.isArray(c.families) || !c.families.length)
    return;
  let familyAx =
    axes.find((a) => a.slot === "middle" && a.name === "family") ||
    axes.find((a) => a.slot === "middle");
  if (!familyAx) {
    const insertAt = scaleAxisIndex();
    familyAx = {
      id: "ax" + ++axisSeq,
      name: "family",
      locked: false,
      slot: "middle",
    };
    axes.splice(insertAt < 0 ? axes.length : insertAt, 0, familyAx);
  }
  if (!c.values) c.values = {};
  c.values[familyAx.id] = {
    mode: "branched",
    branches: c.families.map((f) => ({
      id: f.id && /^br\d+$/.test(f.id) ? f.id : mkBranchId(),
      value: f.name,
      values: { scale: f.scale || mkAxisVal() },
    })),
  };
  shadowSubsequentAxes(c.values, familyAx.id);
  delete c.mode;
  delete c.families;
}

function normalizeCategory(c) {
  if (!c.values) c.values = {};
  if (typeof c.dtcgType !== "string" || !DTCG_TYPES.has(c.dtcgType)) {
    c.dtcgType = "";
  }
  migrateFamiliesMode(c);
  delete c.mode;
  delete c.families;
  normalizeValuesScope(c.values, firstConfigurableAxisIndex());
  walkBranchedValues(c.values, (values) => {
    for (const ax of axes) {
      if (ax.slot === "namespace" || ax.slot === "category") continue;
      const av = values[ax.id];
      if (!isBranched(av)) continue;
      av.branches.forEach((br) => {
        if (typeof br.dtcgType !== "string" || !DTCG_TYPES.has(br.dtcgType)) {
          br.dtcgType = "";
        }
      });
    }
  });
}

function walkBranchedValues(values, fn) {
  fn(values);
  for (const ax of axes) {
    if (ax.slot === "namespace" || ax.slot === "category") continue;
    const av = values[ax.id];
    if (!isBranched(av)) continue;
    av.branches.forEach((br) => {
      if (!br.values) br.values = {};
      walkBranchedValues(br.values, fn);
    });
  }
}

/* ── Scale generation ─────────────────────────────── */
function genValues(axisVal) {
  const cfg = axisVal.config || {};
  switch (axisVal.type) {
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
      return axisVal.list && axisVal.list.length ? axisVal.list : [];
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

/* ── Token helpers ─────────────────────────────────── */
function firstConfigurableAxisIndex() {
  return axes.findIndex(
    (a) => a.slot !== "namespace" && a.slot !== "category",
  );
}

function walkTokenPaths(category, values, prefixParts, axisIdx) {
  if (axisIdx >= axes.length) {
    const token = joinTokenParts(prefixParts);
    return token ? [token] : [];
  }

  const ax = axes[axisIdx];
  if (ax.slot === "namespace" || ax.slot === "category") {
    return walkTokenPaths(category, values, prefixParts, axisIdx + 1);
  }

  const av = values[ax.id];
  if (!av || av.type === "unused") {
    return walkTokenPaths(category, values, prefixParts, axisIdx + 1);
  }

  if (isBranched(av)) {
    let out = [];
    for (const br of av.branches) {
      const seg = tokenPart(br.value);
      const childValues = br.values || {};
      const nextPrefix = seg ? [...prefixParts, seg] : prefixParts;
      out = out.concat(
        walkTokenPaths(category, childValues, nextPrefix, axisIdx + 1),
      );
    }
    return out;
  }

  const rawVals = genValues(av);
  if (!rawVals.length) {
    return walkTokenPaths(category, values, prefixParts, axisIdx + 1);
  }

  let out = [];
  for (const raw of rawVals) {
    const seg = tokenPart(raw);
    const nextPrefix = seg ? [...prefixParts, seg] : prefixParts;
    out = out.concat(
      walkTokenPaths(category, values, nextPrefix, axisIdx + 1),
    );
  }
  return out;
}

function walkTokenSegments(category, values, prefixSegments, axisIdx) {
  if (axisIdx >= axes.length) {
    return prefixSegments.length ? [prefixSegments] : [];
  }

  const constrained = constrainedTokenSegments(values, axisIdx);
  if (constrained) {
    return constrained.map((segments) => [...prefixSegments, ...segments]);
  }

  const ax = axes[axisIdx];
  if (ax.slot === "namespace" || ax.slot === "category") {
    return walkTokenSegments(category, values, prefixSegments, axisIdx + 1);
  }

  const av = values[ax.id];
  if (!av || av.type === "unused") {
    return walkTokenSegments(category, values, prefixSegments, axisIdx + 1);
  }

  if (isBranched(av)) {
    let out = [];
    for (const br of av.branches) {
      const seg = tokenPart(br.value);
      const childValues = br.values || {};
      const nextPrefix = seg
        ? [...prefixSegments, { ax, val: seg, dtcgType: br.dtcgType || "" }]
        : prefixSegments;
      out = out.concat(
        walkTokenSegments(category, childValues, nextPrefix, axisIdx + 1),
      );
    }
    return out;
  }

  const rawVals = genValues(av);
  if (!rawVals.length) {
    return walkTokenSegments(category, values, prefixSegments, axisIdx + 1);
  }

  let out = [];
  for (const raw of rawVals) {
    const seg = tokenPart(raw);
    const nextPrefix = seg
      ? [...prefixSegments, { ax, val: seg }]
      : prefixSegments;
    out = out.concat(
      walkTokenSegments(category, values, nextPrefix, axisIdx + 1),
    );
  }
  return out;
}

function hasBranchedAxes() {
  return categories.some((c) => {
    let found = false;
    walkBranchedValues(c.values, (values) => {
      for (const ax of axes) {
        if (ax.slot === "namespace" || ax.slot === "category") continue;
        if (isBranched(values[ax.id])) found = true;
      }
    });
    return found;
  });
}

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

  function collect(values, axisIdx) {
    if (axisIdx >= axes.length) return;
    const ax = axes[axisIdx];
    if (ax.slot === "namespace" || ax.slot === "category") {
      collect(values, axisIdx + 1);
      return;
    }
    if (isShadowedAtLevel(values, ax.id)) return;
    const av = values[ax.id];
    if (!av || av.type === "unused") {
      collect(values, axisIdx + 1);
      return;
    }
    if (isBranched(av)) {
      const vals = av.branches.map((b) => b.value).filter(Boolean);
      if (vals.length) parts.push({ ax, vals });
      return;
    }
    const flatVals = genValues(av).filter((v) => !isOmittedAxisValue(v));
    if (flatVals.length) parts.push({ ax, vals: flatVals });
    collect(values, axisIdx + 1);
  }

  collect(category.values, firstConfigurableAxisIndex());
  return parts;
}

function allTokensForCategory(category) {
  const prefix = [];
  if (namespaceEnabled && namespaceValue) prefix.push(namespaceValue);
  prefix.push(category.name);
  const start = firstConfigurableAxisIndex();
  if (start < 0) return [];
  return walkTokenSegments(category, category.values, [], start).map((segments) =>
    joinTokenParts([...prefix, ...segments.map((segment) => segment.val)]),
  );
}

function tokenPathCollisions(category) {
  const start = firstConfigurableAxisIndex();
  if (start < 0) return [];
  const seen = new Set();
  const collisions = new Set();
  walkTokenSegments(category, category.values, [], start).forEach((segments) => {
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

    const start = firstConfigurableAxisIndex();
    const paths =
      start < 0
        ? []
        : walkTokenSegments(c, c.values, [], start);

    if (!paths.length) {
      applyDtcgLeafPlaceholders(group);
    } else {
      let anyParts = false;
      paths.forEach((segs) => {
        const parts = segs.map((s) => s.val).filter(Boolean);
        if (!parts.length) return;
        anyParts = true;
        dtcgEnsurePath(group, parts);
        dtcgApplySegmentTypes(group, segs);
      });
      if (!anyParts) {
        applyDtcgLeafPlaceholders(group);
      }
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
      out += exportAxisValues(c, c.values, 0, firstConfigurableAxisIndex());
      out += "\n";
    });
  }

  out +=
    "---\n\n*Generated with the Tier 1/2 Naming Builder — Design System Workshop*\n";
  return out;
}

function exportAxisValues(category, values, depth, startAxisIdx) {
  let out = "";
  const pad = "  ".repeat(depth);
  const combinationDefs = combinationAxes(values, startAxisIdx);
  const combinationCfg = combinationConfig(values);
  if (combinationCfg && combinationDefs) {
    out += `${pad}- **Combination rules**: ${(combinationCfg.rules || []).length} generated, ${(combinationCfg.additions || []).length} explicit\n`;
    (combinationCfg.rules || []).forEach((rule, i) => {
      const count = combinationProduct(combinationDefs, rule.selections || {}).length;
      out += `${pad}  - Generated rule ${i + 1} (${count} combination${count !== 1 ? "s" : ""}): ${combinationDefs.map(({ ax }) => `${ax.name}=${(rule.selections?.[ax.id] || []).join(", ")}`).join("; ")}\n`;
    });
    (combinationCfg.additions || []).forEach((addition) => {
      out += `${pad}  - Explicit: ${combinationDefs.map(({ ax }) => `${ax.name}=${addition[ax.id]}`).join("; ")}\n`;
    });
    return out;
  }
  for (let i = startAxisIdx; i < axes.length; i++) {
    const ax = axes[i];
    if (ax.slot === "namespace" || ax.slot === "category") continue;
    if (depth === 0 && isShadowedAtLevel(values, ax.id)) continue;
    const av = values[ax.id];
    if (!av) continue;
    if (isBranched(av)) {
      out += `${pad}- **${ax.name}** (branched)\n`;
      av.branches.forEach((br) => {
        out += `${pad}  - **${br.value}**\n`;
        out += `${pad}    - **Token type**: ${br.dtcgType ? `\`${br.dtcgType}\`` : "_not set_"}\n`;
        if (br.values) {
          out += exportAxisValues(category, br.values, depth + 2, i + 1);
        }
      });
      break;
    }
    if (av.type === "unused") {
      out += `${pad}- **${ax.name}** (Unused): _skipped_\n`;
      continue;
    }
    const vals = genValues(av);
    const typeLbl = SCALE_TYPES[av.type]?.label || av.type;
    out += `${pad}- **${ax.name}** (${typeLbl}): ${vals.length ? vals.join(", ") : "_none_"}\n`;
  }
  return out;
}

const STATE_VERSION = 2;

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
    brSeq,
  };
}

function recomputeSeqCounters() {
  axisSeq = axes.reduce((max, a) => {
    const m = /^ax(\d+)$/.exec(a.id);
    return m ? Math.max(max, +m[1]) : max;
  }, 0);
  catSeq = categories.reduce((max, c) => {
    const m = /^cat(\d+)$/.exec(c.id);
    return m ? Math.max(max, +m[1]) : max;
  }, 0);
  brSeq = 0;
  categories.forEach((c) => {
    walkBranchedValues(c.values, (values) => {
      for (const ax of axes) {
        if (ax.slot === "namespace" || ax.slot === "category") continue;
        const av = values[ax.id];
        if (!isBranched(av)) continue;
        av.branches.forEach((br) => {
          const m = /^br(\d+)$/.exec(br.id);
          if (m) brSeq = Math.max(brSeq, +m[1]);
        });
      }
    });
  });
}

function validateBranchedAxis(av, axisName, categoryName) {
  if (!isBranched(av)) return null;
  if (!av.branches.length)
    return `Branched axis "${axisName}" in category "${categoryName}" has no branches.`;
  const names = new Set();
  for (const br of av.branches) {
    if (!br.value)
      return `A branch on "${axisName}" in category "${categoryName}" is missing a value.`;
    if (names.has(br.value))
      return `Duplicate branch "${br.value}" on "${axisName}" in category "${categoryName}".`;
    names.add(br.value);
  }
  return null;
}

function validateCombinationConfig(values, startAxisIdx, categoryName, branchPath) {
  const cfg = combinationConfig(values);
  if (!cfg) return null;
  const defs = combinationAxes(values, startAxisIdx);
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
  return null;
}

function validateCategoryValues(values, categoryName, startAxisIdx, branchPath) {
  if (startAxisIdx == null) startAxisIdx = firstConfigurableAxisIndex();
  if (!branchPath) branchPath = [];
  const combinationErr = validateCombinationConfig(values, startAxisIdx, categoryName, branchPath);
  if (combinationErr) return combinationErr;
  for (let i = startAxisIdx; i < axes.length; i++) {
    const ax = axes[i];
    if (ax.slot === "namespace" || ax.slot === "category") continue;
    if (startAxisIdx === firstConfigurableAxisIndex() && isShadowedAtLevel(values, ax.id))
      continue;
    const av = values[ax.id];
    if (!av) continue;
    const err = validateBranchedAxis(av, ax.name, categoryName);
    if (err) return err;
    if (isBranched(av)) {
      for (const br of av.branches) {
        if (
          br.dtcgType != null &&
          br.dtcgType !== "" &&
          !DTCG_TYPES.has(br.dtcgType)
        ) {
          return `Unknown token type "${br.dtcgType}" in category "${categoryName}" at subcategory path "${[...branchPath, br.value || "?"].join(" / ")}".`;
        }
        if (br.values) {
          const nested = validateCategoryValues(
            br.values,
            categoryName,
            i + 1,
            [...branchPath, br.value || "?"],
          );
          if (nested) return nested;
        }
      }
      break;
    }
  }
  return null;
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

function validateState(data) {
  if (!data || typeof data !== "object") return "Invalid project data.";
  if (data.version !== 1 && data.version !== STATE_VERSION)
    return "Incompatible file version — expected version 1 or 2.";
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
    if (
      c.dtcgType != null &&
      c.dtcgType !== "" &&
      !DTCG_TYPES.has(c.dtcgType)
    )
      return `Unknown token type "${c.dtcgType}" in category "${c.name || "?"}".`;
    const err = validateCategoryValues(c.values || {}, c.name || "?");
    if (err) return err;
  }
  return null;
}

/* ── Loading ───────────────────────────────────────── */
// Migrates, validates and loads a project file into the model state.
// Returns an error message, or null when the project loaded.
function loadProjectState(data) {
  const migrated = migrateState(data);
  const err = validateState(migrated);
  if (err) return err;
  tierMode = migrated.tierMode === "tier2" ? "tier2" : "tier1";
  namespaceEnabled = !!migrated.namespaceEnabled;
  namespaceValue = String(migrated.namespaceValue || "");
  projectTitle =
    String(migrated.projectTitle || defaultTitleForTier(tierMode)).trim() ||
    defaultTitleForTier(tierMode);
  axes = JSON.parse(JSON.stringify(migrated.axes));
  categories = JSON.parse(JSON.stringify(migrated.categories));
  recomputeSeqCounters();
  if (typeof migrated.axisSeq === "number")
    axisSeq = Math.max(axisSeq, migrated.axisSeq);
  if (typeof migrated.catSeq === "number")
    catSeq = Math.max(catSeq, migrated.catSeq);
  if (typeof migrated.brSeq === "number")
    brSeq = Math.max(brSeq, migrated.brSeq);
  if (typeof migrated.famSeq === "number")
    brSeq = Math.max(brSeq, migrated.famSeq);
  categories.forEach((c) => {
    normalizeCategory(c);
    initCategoryValues(c);
  });
  syncScaleAxisForTier();
  return (
    categories
      .map((c) => validateCategoryValues(c.values, c.name))
      .find(Boolean) || null
  );
}

// Every token in the project, in export order: its tokens.json path (namespace
// and category first, omitted values left out) and the token type it gets,
// which is the type of the nearest branch along the path that sets one, else
// the category's type.
function allTokens() {
  const start = firstConfigurableAxisIndex();
  if (start < 0) return [];
  const prefix = namespaceEnabled && namespaceValue ? [namespaceValue] : [];
  return categories.flatMap((c) =>
    walkTokenSegments(c, c.values, [], start).map((segments) => {
      const typed = segments.filter((s) => s.val && DTCG_TYPES.has(s.dtcgType));
      const type = typed.length ? typed[typed.length - 1].dtcgType : c.dtcgType;
      return {
        path: [...prefix, c.name, ...segments.map((s) => s.val)].filter(Boolean),
        type: type || "",
      };
    }),
  );
}

// Every token name in the project, as written in the CSS export.
function allTokenNames() {
  return categories.flatMap((c) => allTokensForCategory(c));
}

if (typeof module === "object" && module.exports) {
  module.exports = { loadProjectState, allTokens, allTokenNames };
}
