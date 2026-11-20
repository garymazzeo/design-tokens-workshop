# Domain Docs

## Before exploring

Read `CONTEXT.md` at the repository root and relevant ADRs in `docs/adr/` before exploring a domain area.

If these files do not exist, proceed silently. Do not flag their absence or create them upfront. Domain documentation is created lazily when terminology or architectural decisions are actually resolved.

## Layout

This is a single-context repository:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Vocabulary

Use terminology defined in `CONTEXT.md`. If a needed concept is missing, treat that as a signal for `/domain-modeling`.

## ADR conflicts

If work contradicts an existing ADR, surface the conflict explicitly instead of silently overriding it.
