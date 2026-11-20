# Design Tokens Workshop

A workshop and toolkit for naming design tokens systematically. These terms describe how token names are put together in the Token Naming Builder.

## Language

### Token names

**Token name**:
A dot- or dash-separated name made by joining one value from each active axis, in axis order.
_Avoid_: token path (the path is the token name written as a DTCG group nesting)

**Formula**:
The ordered list of axes that every token name in a project follows, e.g. `{namespace}.{category}.{family}.{variant}.{role}.{state}`.
_Avoid_: pattern, template

**Namespace**:
An optional, project-wide prefix that comes first in every token name (e.g. `mds`).

**Category**:
The top-level kind of token (color, spacing, typography…). Each category has its own token type, and that type can differ from the category's name (spacing → `dimension`).
_Avoid_: group, type

**Axis**:
One position in the formula, such as family, variant, role or state. Axes are shared by the whole project: adding, removing or reordering an axis changes every category.
_Avoid_: dimension, segment, column

**Axis value**:
One of the values an axis can take inside a category (e.g. `hover` on the state axis). Each category sets its own values for each axis.

**Unused axis**:
An axis that a category opts out of, so that category's token names leave the axis out. The axis still exists for every other category.
_Avoid_: bypassed, disabled

**Group**:
A set of values for one axis within a category, plus a **Condition**. Every axis has an "ALL" group with no condition. When one or more conditional groups match a token name so far, their values combine and replace ALL; when none match, ALL applies.
_Avoid_: branch, branch group, rule, combination

**Condition**:
The values on earlier axes that a group applies to (e.g. `family = feedback`, or `family = brand` and `role = container`).

**Value generator**:
How a group produces its values: a literal list, a numeric range, an ordinal sequence, or t-shirt sizes.

**Omitted value**:
An axis value written in brackets (e.g. `[base]`, `[default]`) that produces a token but adds nothing to its name.

### Tiers

**Tier 1 (primitive)**:
Naming for raw values; scale is a required axis.

**Tier 2 (semantic)**:
Naming for values by purpose; scale is an ordinary, optional axis.

## Relationships

- A **Project** has one **Formula**, an optional **Namespace**, and one or more **Categories**
- A **Formula** is an ordered list of **Axes**, shared by every **Category**
- A **Category** gives each **Axis** one or more **Groups**, or marks it as an **Unused axis**
- A **Group** belongs to one **Axis** in one **Category**, and has one **Condition** and one **Value generator**
- A **Group's Condition** names only **Axes** that come earlier in the **Formula**

## Example dialogue

> **Dev:** "If I add a `density` axis while I'm on the spacing category, does color get it too?"
> **Domain expert:** "Yes — axes belong to the formula, not the category. Color just marks `density` as an unused axis."

> **Dev:** "Feedback colors only need container, text and icon roles. Brand needs all five."
> **Domain expert:** "Put all five in the role axis's ALL group, and add a group with the condition `family = feedback` holding just the three. For feedback that group replaces ALL."
