---
status: accepted
---

# Groups replace branched axes and constrained-combination rules

The Token Naming Builder used to narrow which tokens it made in two separate ways: **branched axes**, where each value of an axis owned its own values for every later axis, and **constrained combinations**, a separate panel per scope holding generated rules (multi-select blocks whose combinations were all made) and explicit combinations (single exact paths). The redesign replaces both with a single concept, the **Group**. A Group is a set of values for one axis, plus a condition on values of any earlier axes. Every axis has an unconditioned "ALL" group. When conditional groups match a path, their values combine and replace ALL; when none match, ALL applies. We picked one concept because the new design shows conditioning directly on each axis column, and because conditions spanning any earlier axes can express any set of token paths, so nothing that branches or rules could do is lost.

## Consequences

- Saved projects, imported project files and presets are converted one way to groups when they load, and the project-file version goes up. Old-format files still load; the builder no longer writes them.
- Value generators (numeric, ordinal, t-shirt, custom list) and token-type overrides move from branches onto groups. A group can override its category's token type only when its condition includes the axis right after category, to avoid conflicting types deeper in a name.
- Exactly one token (what an explicit combination used to make) now takes a chain of conditional groups. That is more verbose, and we accepted it as the cost of having one model.

## Considered options

- **Keep the old storage format and only display it as groups.** Rejected: the display and the stored model would drift apart, and the rules panel's generated blocks don't map cleanly onto per-axis columns.
- **Make ALL and conditional groups combine instead of override.** Rejected: a conditional group could then never have *fewer* values than ALL. That breaks the common case "feedback colors only need three roles".
