#!/usr/bin/env node
// Checks that the Token Naming Builder's model still produces the same token
// names as the recorded fixtures in docs/fixtures/naming-builder/.
//
// Each fixture directory holds what the builder exported for one project:
// project.json, tokens.css, tokens.json and naming.md. Hand-built fixtures also
// keep source.json, the project file as it was written before the builder
// loaded it (e.g. an old file version). For each project file the script loads
// it through the builder's state-loading code, computes the token names and
// types, and compares them with tokens.css (names) and tokens.json (paths and
// $type). naming.md is recorded for reference but not compared.
//
// Usage: node scripts/check-naming-parity.mjs

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import model from "../tools/token-naming-model.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixturesDir = join(root, "docs/fixtures/naming-builder");

function namesFromCss(css) {
  return [...css.matchAll(/^\s*--([^:\s]+)\s*:/gm)].map((m) => m[1]);
}

// tokens.json tokens as a Map of path (segments joined with ".") to $type,
// with $type inherited from the nearest group that sets it.
function tokensFromDtcg(json) {
  const tokens = new Map();
  (function walk(node, path, type) {
    if (typeof node.$type === "string") type = node.$type;
    if (Object.prototype.hasOwnProperty.call(node, "$value")) {
      tokens.set(path.join("."), type);
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") || !child || typeof child !== "object") continue;
      walk(child, [...path, key], type);
    }
  })(JSON.parse(json), [], "");
  return tokens;
}

// What tokens.json should hold for the model's tokens. A tokens.json node
// can't be a token and a group at once, so a token whose path is the start of
// another token's path becomes a group and drops out.
function expectedDtcgTokens(tokens) {
  const entries = tokens.map(({ path, type }) => [path.join("."), type]);
  return new Map(
    entries.filter(([k]) => !entries.some(([other]) => other.startsWith(k + "."))),
  );
}

function compareTypes(expected, actual) {
  const wrong = [...expected]
    .filter(([path, type]) => actual.has(path) && actual.get(path) !== type)
    .map(([path, type]) => `${path} is ${actual.get(path) || "untyped"}, expected ${type || "untyped"}`);
  return wrong.length ? [`tokens.json: wrong $type: ${wrong.join("; ")}`] : [];
}

function compare(label, expected, actual) {
  const problems = [];
  const exp = new Set(expected);
  const act = new Set(actual);
  if (exp.size !== expected.length) problems.push(`${label}: fixture has duplicate names`);
  const missing = [...exp].filter((n) => !act.has(n));
  const extra = [...act].filter((n) => !exp.has(n));
  if (missing.length) problems.push(`${label}: missing ${missing.join(", ")}`);
  if (extra.length) problems.push(`${label}: unexpected ${extra.join(", ")}`);
  return problems;
}

const fixtures = readdirSync(fixturesDir)
  .filter((name) => statSync(join(fixturesDir, name)).isDirectory())
  .sort();

if (!fixtures.length) {
  console.error(`No fixtures found in ${fixturesDir}`);
  process.exit(1);
}

let failed = 0;
for (const name of fixtures) {
  const dir = join(fixturesDir, name);
  const read = (file) => readFileSync(join(dir, file), "utf8");
  const problems = [];

  const css = namesFromCss(read("tokens.css"));
  const dtcg = tokensFromDtcg(read("tokens.json"));
  const projectFiles = ["project.json", "source.json"].filter((f) =>
    existsSync(join(dir, f)),
  );

  for (const file of projectFiles) {
    const err = model.loadProjectState(JSON.parse(read(file)));
    if (err) {
      problems.push(`${file} did not load: ${err}`);
      continue;
    }
    const names = model.allTokenNames();
    const tokens = model.allTokens();
    if (new Set(names).size !== names.length)
      problems.push(`${file}: model produced duplicate names`);
    const expected = expectedDtcgTokens(tokens);
    problems.push(
      ...compare(`${file} → tokens.css`, css, names),
      ...compare(`${file} → tokens.json`, [...dtcg.keys()], [...expected.keys()]),
      ...compareTypes(dtcg, expected).map((p) => `${file} → ${p}`),
    );
  }

  if (problems.length) {
    failed++;
    console.log(`✗ ${name}`);
    problems.forEach((p) => console.log(`    ${p}`));
  } else {
    console.log(`✓ ${name}`);
  }
}

console.log(`\n${fixtures.length - failed}/${fixtures.length} fixtures match`);
process.exit(failed ? 1 : 0);
