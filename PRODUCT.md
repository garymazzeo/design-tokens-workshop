# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are working design-system teams (designers and developers) who use the workshop's tools as production utilities for generating real token conventions and outputs — not as passive reading material. In the course of their work they need a systematic, reproducible way to name, structure, and build design tokens that survive contact with real codebases and tools like Figma.

## Product Purpose

The Design Tokens Workshop teaches a systems-thinking approach to design-token naming across six layers, and pairs that methodology with interactive, standalone web tools that turn the method into usable artifacts: naming conventions, DTCG/Terrazzo-shaped JSON, CSS stubs, and completed token values. Success means a team can take a coherent token recipe from this site into their own production project and it holds up — consistent names, validated values, and outputs that other tooling can consume.

## Positioning

A single, method-driven toolkit that couples an explicit six-layer naming methodology with production utilities that emit standards-shaped output (DTCG/Terrazzo JSON, aliases preserved, CSS stubs) from the same source model. The planned build pipeline extends this by projecting one DTCG source model into two platform outputs — live CSS custom properties and concrete Figma Variables — from the same tokens. The mechanism a generic tool cannot truthfully copy is the coupling of a disciplined, cross-team naming process with output that stays valid and interoperable.

## Operating Context

- Public, MIT-licensed, static web project hosted on GitHub, authored and maintained by Gary Mazzeo.
- Delivered as plain static HTML/CSS/JS — no framework, no build step, no server dependency. Each tool is an HTML document under `tools/`; a tool may load a sibling plain `.js` file with `<script src>` (e.g. `token-naming-model.js`, which Node scripts can also load), as long as it still opens straight from disk.
- The workshop is used in two registers: as a self-serve curriculum (landing page, online handbook, printable PDF) and, for the confirmed primary user, as a production toolkit (the interactive tools).
- The repository also carries a planned build specification: `docs/specs/terrazzo-derived-outputs.md`.

## Capabilities and Constraints

- Six-layer naming methodology for design tokens, documented in the handbook and reflected in the interactive tools.
- Interactive tools: token naming builder (axis / constrained-combination model, DTCG-shaped JSON + CSS stub export), token value builder (typed DTCG/Terrazzo values, alias preservation, JSON export), token naming worksheet (six-question decision record), three-tier token chain builder (primitive → semantic → component), component anatomy mapper, and a design-system naming reference card.
- Token sources are (and remain) valid DTCG/Terrazzo, including aliases.
- Confirmed durable constraint: the project stays plain static HTML/CSS/JS with no framework or build step. The tools are standalone, framework-free documents.
- Confirmed core direction: a portable Terrazzo build that turns one DTCG token source into two projections — (1) CSS custom properties that preserve live relationships such as `calc()` for arithmetic derivations, and (2) concrete, Figma-compatible Variables. Arithmetic is recorded as a namespaced `$extensions` derivation contract, not embedded in `$value`.
- Undecided / deferred: Figma API upload, additional platforms, resolver/theme/mode UI, and any expansion of the derivation operation set are not yet in scope.

## Brand Commitments

- Product name: "Design Tokens Workshop."
- Flagship curriculum title: "Systems Thinking and Token Naming."
- MIT License; copyright Gary Mazzeo; repository `garymazzeo/design-tokens-workshop`.
- The visual identity is incumbent (see the incumbent implementation) and is not altered by init; no new visual commitments were made.

## Evidence on Hand

- Landing page: `index.html` (hero, six-layer narrative, tools directory, handbook links).
- Tools: `tools/token-naming-builder.html`, `tools/token-value-builder.html`, `tools/token-naming-worksheet.html`, `tools/three-tier-chain-builder.html`, `tools/component-anatomy-mapper.html`, `tools/design_system_naming_reference_card.html`.
- Handbook: `handbook/Systems Thinking and Token Naming.md` and `.pdf`.
- Build specification: `docs/specs/terrazzo-derived-outputs.md` (problem statement, user stories, acceptance criteria, out-of-scope list).
- No testimonials, case studies, pricing, or deployment claims exist; these must not be fabricated.

## Product Principles

1. One source of truth: the same DTCG token source must feed every projection (naming convention, CSS, Figma), so platforms never diverge by hand.
2. Keep it standards-shaped: output stays valid DTCG/Terrazzo and preserves aliases; don't break the source to satisfy a single consumer.
3. Method over taste: naming decisions come from the explicit six-layer system, not ad-hoc judgment, so the method stays teachable and auditable.
4. Production-utility-first: for the confirmed primary user the tools must yield artifacts a real design-system team can take into a codebase, not just demonstrate ideas.
5. Stay lean and portable: honor the no-framework, static, no-build constraint so the workshop keeps working anywhere without a build or deploy chain.

## Accessibility & Inclusion

No product-specific accessibility standard was confirmed during init. The incumbent implementation already honors `prefers-reduced-motion` and ships a full dark theme via `prefers-color-scheme`; these stand as incumbent constraints, not new commitments.
