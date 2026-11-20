# Terrazzo Derived Outputs

## Problem Statement

The workshop now has a token naming builder and a token value builder that produce DTCG/Terrazzo-compatible token files. The next workflow needs to turn those tokens into two platform outputs:

- CSS custom properties that can preserve live relationships such as `calc(var(--space-base) * 2)`.
- Figma Variables with concrete values, because Figma variables cannot retain CSS `calc()` expressions.

Terrazzo and DTCG support aliases, but aliases do not express arithmetic. A token that aliases a base dimension cannot also mean “multiply the base by two” without an additional derivation contract. The project needs a portable, reproducible build implementation that preserves one source model while producing platform-appropriate projections.

## Solution

Create a portable Node/Terrazzo build project that treats DTCG token JSON as the source contract and adds a namespaced derivation extension for arithmetic relationships.

The build pipeline will:

1. Validate source tokens with Terrazzo.
2. Resolve and validate derivation metadata.
3. Produce CSS through the official Terrazzo CSS plugin, preserving supported live relationships as CSS expressions.
4. Produce Figma-compatible data through a custom exporter that materializes derived values.

The source token remains valid DTCG. Arithmetic is represented as optional `$extensions` metadata and interpreted by this project’s custom output integrations.

## User Stories

1. As a design-system author, I want to define a base dimension token, so that other dimensions can derive from it without duplicating the relationship in prose.
2. As a design-system author, I want to express multiplication relationships such as base spacing times two, so that the scale remains mathematically consistent.
3. As a design-system author, I want to express fractional relationships such as half the base spacing, so that compact scale values remain tied to the base.
4. As a design-system author, I want the source file to remain valid DTCG JSON, so that standard token tooling can parse and preserve it.
5. As a design-system author, I want ordinary aliases to continue working unchanged, so that non-derived semantic tokens retain their existing behavior.
6. As a design-system author, I want a derived token to identify its source token explicitly, so that the dependency is inspectable and resolvable.
7. As a design-system author, I want unsupported derivation operations to fail validation, so that malformed output is caught before generation.
8. As a design-system author, I want missing derivation sources to fail validation, so that a build cannot silently produce an incorrect value.
9. As a design-system author, I want circular derivations to fail validation, so that the build cannot recurse indefinitely.
10. As a design-system author, I want unit mismatches to fail validation, so that multiplying pixels by a rem value does not produce an ambiguous result.
11. As a design-system author, I want dimension derivations to preserve the source unit, so that `4px × 2` becomes `8px` and not an untyped number.
12. As a web developer, I want CSS output to preserve live relationships where possible, so that changing a base custom property updates derived custom properties automatically.
13. As a web developer, I want CSS output to use `calc()` for arithmetic derivations, so that the browser performs the relationship at runtime.
14. As a web developer, I want ordinary aliases to remain CSS variable references, so that theme and override behavior stays live.
15. As a web developer, I want CSS output to use valid custom-property syntax, so that derived dimensions can be consumed by normal CSS declarations.
16. As a web developer, I want CSS output to preserve Terrazzo’s color handling and typography behavior, so that custom derivation support does not replace the official CSS plugin.
17. As a Figma user, I want derived dimensions to appear as concrete Figma Variable values, so that Figma can use them even though it cannot evaluate CSS `calc()`.
18. As a Figma user, I want the Figma export to use the same source and derivation rules as CSS, so that the two platforms do not drift.
19. As a Figma user, I want unsupported token types to be reported clearly, so that I know which tokens require manual mapping or a future adapter.
20. As a build maintainer, I want the derivation evaluator to be shared by all platform exporters, so that arithmetic semantics are implemented once.
21. As a build maintainer, I want the CSS integration to be isolated from the Figma adapter, so that platform-specific limitations do not leak into the source token model.
22. As a build maintainer, I want the project to use the official Terrazzo CSS plugin, so that standard CSS behavior is not reimplemented locally.
23. As a build maintainer, I want the Figma integration to be explicit about being custom, so that the project does not imply Terrazzo provides a built-in Figma exporter.
24. As a build maintainer, I want the build to run on another machine after installing declared dependencies, so that it does not rely on global tools or local paths.
25. As a build maintainer, I want a lockfile and documented Node version, so that builds are reproducible across machines.
26. As a build maintainer, I want all build commands available through package scripts, so that contributors do not need to remember implementation-specific CLI arguments.
27. As a build maintainer, I want source validation to run before output generation, so that invalid tokens do not produce partially valid platform files.
28. As a build maintainer, I want `tz check` integrated into the normal verification path, so that DTCG and Terrazzo validation is not optional.
29. As a build maintainer, I want token linting integrated into the normal verification path, so that naming and structural quality checks run consistently.
30. As a build maintainer, I want TypeScript checking for custom integration code, so that exporter changes are checked before builds run.
31. As a build maintainer, I want CSS output tests to assert live references and `calc()` expressions, so that a refactor cannot accidentally materialize CSS values.
32. As a build maintainer, I want Figma output tests to assert concrete numeric values, so that a refactor cannot leak CSS expressions into Figma data.
33. As a build maintainer, I want source metadata to be preserved when tools rewrite tokens, so that derivation information is not lost during value editing.
34. As a value-tool user, I want to choose a derivation source from existing dimension tokens, so that I do not have to type token paths manually.
35. As a value-tool user, I want to choose a supported arithmetic operation and factor, so that derivations are discoverable and constrained.
36. As a value-tool user, I want derived tokens to be visibly marked, so that I can distinguish a live relationship from a literal value.
37. As a value-tool user, I want to edit the derivation metadata without replacing it with a literal, so that I can preserve live CSS relationships.
38. As a value-tool user, I want the value tool to show the computed preview of a derivation, so that I can verify the result before export.
39. As a value-tool user, I want the value tool to warn when a derivation cannot be compiled for Figma, so that I understand the platform difference.
40. As a value-tool user, I want aliases and derivations to be preserved when importing and exporting, so that the authoring tool does not flatten relationships accidentally.
41. As a value-tool user, I want the value tool to preserve unknown `$extensions` data, so that it remains compatible with future or external integrations.
42. As a value-tool user, I want the value tool to validate derivation source types, so that a dimension cannot derive from a color or typography token.
43. As a value-tool user, I want the value tool to report derivation cycles, so that I can fix dependency errors at authoring time.
44. As a value-tool user, I want literal tokens to remain available, so that not every value is forced into a derived relationship.
45. As a value-tool user, I want composite token fields to support aliases and derivations where their component types allow them, so that borders, shadows, and typography can use the same source model.
46. As a release engineer, I want the CSS and Figma outputs to be generated from the same commit, so that platform artifacts are traceable to one token source.
47. As a release engineer, I want generated outputs separated from source tokens, so that generated files are not mistaken for authoring files.
48. As a release engineer, I want build failures to identify the token path and derivation metadata involved, so that failures are actionable.
49. As a repository maintainer, I want the implementation documented as a portable project, so that another machine can reproduce the build without access to this workspace.
50. As a repository maintainer, I want the integration to leave room for future resolver contexts, so that themes and modes can be added without redesigning derivation semantics.

## Implementation Decisions

- The implementation is a standalone Node/Terrazzo build project rather than browser-only logic.
- The DTCG token file is the source contract. Naming-builder project state is not consumed directly by the build.
- The official Terrazzo CSS plugin is used for normal CSS output.
- Figma output is a custom adapter because Terrazzo’s documented Figma workflow is import from Figma, not export to Figma Variables.
- The custom adapter consumes resolved token data and emits Figma-compatible variable records or an equivalent importable data file. The exact transport into Figma is a separate adapter boundary.
- The source format uses a namespaced `$extensions` key for derivation metadata. The extension namespace must be project-specific and documented.
- A derivation identifies a source token, an operation, and an operation operand. The initial operation set is intentionally small: multiplication and division by a numeric factor.
- Derivations are limited initially to compatible `dimension` values. The evaluator preserves the source unit and returns a dimension value.
- Arithmetic is not embedded in the `$value` alias string. The `$value` remains a normal DTCG alias, while the extension records the derivation contract.
- An example derivation conceptually has the shape `{ from: "space.base", operation: "multiply", factor: 2 }`; this is a decision-rich schema sketch, not a commitment to a public property name.
- The derivation evaluator resolves source aliases and chained derivations before applying the operation.
- The evaluator rejects missing sources, unsupported source types, invalid factors, unit mismatches, division by zero, and cycles.
- CSS output may preserve a derivation as `calc(var(--source) * factor)` or `calc(var(--source) / factor)` when the source can be represented as a CSS custom property.
- CSS output preserves ordinary aliases as CSS variable references where the official plugin supports them.
- Figma output always materializes derivations into concrete values. Figma Variables must not receive `calc()` expressions.
- The source token remains valid DTCG, but a generic consumer that ignores the project extension will not understand the arithmetic meaning. The documented build pipeline is therefore required for derived-token semantics.
- The values tool must add a derivation editor for compatible dimension tokens, including source-token selection, operation selection, factor entry, computed preview, validation messages, and a clear derived-token indicator.
- The values tool must preserve derivation extensions and unknown extension data on import/export.
- The values tool must not replace a derivation with a literal during ordinary editing. Any future materialization action must be explicit and reversible.
- The values tool must support literal values, ordinary aliases, and derivations as distinct value modes.
- The values tool must show a platform note when a derivation remains live in CSS but is compiled for Figma.
- The build project includes a checked-in fixture token set containing a base dimension, multiplied dimension, divided dimension, ordinary alias, chained derivation, invalid source, and cyclic derivation.
- The build project includes a lockfile, declared Node version, local package scripts, and no machine-specific paths.
- Environment variables are reserved for credentials or external Figma API access; secrets must not be committed.
- The initial implementation does not require a Figma API upload. It must produce deterministic Figma-compatible output first, with API upload as a later boundary.
- The implementation leaves resolver contexts and themes compatible with the source model. Derived values must be evaluated after the relevant resolver context is applied.
- The implementation should use Terrazzo’s parser/transform APIs where they provide the highest stable seam, and custom output integration only where platform behavior differs.

## Testing Decisions

- The primary test seam is an end-to-end portable build fixture: source DTCG tokens go through validation, derivation evaluation, CSS generation, and Figma-data generation.
- Tests assert external behavior, not helper function names, object layout, or internal traversal order.
- The fixture must prove that a base dimension of `4px` produces a CSS derived token using a live `calc()` relationship and a Figma output value of `8px` or its numeric equivalent.
- The fixture must prove that a half-size derivation produces the correct CSS expression and concrete Figma value.
- The fixture must prove that ordinary aliases remain aliases in CSS output.
- The fixture must prove that chained derivations resolve correctly.
- The fixture must fail for missing sources, unsupported source types, invalid factors, unit mismatches, division by zero, and cycles.
- Tests must verify that valid DTCG source JSON passes Terrazzo checking while retaining the custom extension metadata.
- Tests must verify that the CSS output does not accidentally materialize derived dimensions when live CSS behavior is requested.
- Tests must verify that Figma output contains no CSS `calc()` expressions and contains concrete values.
- Tests must verify that unknown token metadata and unknown `$extensions` are preserved.
- Values-tool tests should exercise import, derivation editing, preview, validation, and export through the highest browser-facing seam available.
- If the repository remains without a test runner, add one narrow Node integration harness for the build seam rather than testing browser event handlers individually.
- No prior automated test suite exists in the current repository. The end-to-end fixture is therefore the first regression seam for this integration.

## Out of Scope

- Adding arithmetic expressions to the DTCG standard or pretending that aliases natively support arithmetic.
- Making generic Terrazzo builds understand the project’s derivation extension without the custom integration.
- Replacing the official Terrazzo CSS plugin with a complete custom CSS generator.
- Uploading variables directly to Figma in the initial implementation.
- Supporting every Figma Variable feature, mode, collection, permission model, or publishing workflow initially.
- Supporting arbitrary formulas, conditionals, logarithms, color transforms, or cross-type arithmetic in the first operation set.
- Automatically converting aliases into literals.
- Breaking aliases to support conversion or materialization implicitly.
- Adding resolver authoring or theme/mode UI to the values tool.
- Reworking the naming builder’s axis and constrained-combination model beyond the source tokens required by this build.
- Generating CSS interpolation metadata for gradients; gradient interpolation remains a CSS/plugin concern.
- Replacing the existing token naming or value-builder visual workflows.

## Further Notes

- Style Dictionary demonstrates that platform-specific value transforms and transitive transforms are a viable pattern, but it does not make arithmetic part of DTCG either. The design should retain the same separation: portable token source, platform-specific transforms.
- Terrazzo’s documented JS API supports parsing and transforms before final validation, which is a suitable seam for validating or materializing derivations.
- Terrazzo’s CSS plugin already handles CSS variables, aliases, resolver permutations, and color output. Custom logic should be as narrow as possible.
- The CSS live relationship and Figma compiled value are intentionally different projections of the same source relationship. They should not be forced into one identical serialized value.
- The initial issue should be split into tracer-bullet implementation tickets only after the source derivation contract and output fixture are agreed.
