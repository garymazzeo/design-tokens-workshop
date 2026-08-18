---
name: Design Tokens Workshop
description: A precision workbench for systematic design-token naming — ink on cream paper, measurement and grids, editorial discipline.
colors:
  blueprint-blue: "#185fa5"
  field-green: "#3b6d11"
  drafting-violet: "#534ab7"
  paper-white: "#ffffff"
  warm-paper: "#f4f3ef"
  parchment: "#eceae4"
  ink: "#1a1a18"
  stone: "#56564f"
  slate: "#8a8a82"
  ice-blue-wash: "#e6f1fb"
  leaf-wash: "#eaf3de"
typography:
  display:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.35rem, 6.2vw, 3.65rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.55rem, 3.2vw, 1.9rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.1em"
  mono:
    fontFamily: "'IBM Plex Mono', 'SF Mono', Consolas, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
rounded:
  md: "8px"
  lg: "12px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "3.25rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.7rem 1.15rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.7rem 1.15rem"
  tool-card:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "1.1rem 1.2rem"
---

# Design System: Design Tokens Workshop

## Overview

**Creative North Star: "The Systems Workbench"**

The Design Tokens Workshop is a precision workbench for naming and building design tokens as rules in a system. The interface is disciplined and legible first: ink on cream paper, hairline rules, a measured grid, and an inspection-lens metaphor that invites the eye to examine structure rather than linger on decoration. The paper grain of the incumbent build is retained as surface texture, but the voice is that of a careful craftsman taking measurements — clear hierarchy, restrained accent, and a calm editorial pace suited to long, intentional reading.

The system borrows the restraint of engineering print and the warmth of a well-used paper workshop. Warm cream fields and near-black ink do the heavy lifting; a single blue accent (Blueprint Blue) marks interaction and wayfinding while a green (success) and violet (tertiary) cover status and tertiary emphasis without competing. Type pairs an optical, letter-spaced serif display (Fraunces) with a quiet humanist sans (Source Sans 3) and a monospace (IBM Plex Mono) reserved for the token vocabulary itself — numbers, layer indices, and names.

The system is responsive and adaptive: it honors `prefers-color-scheme` with a full dark layer and `prefers-reduced-motion` by collapsing its reveal animations. The visual character is intentionally de-emphasized relative to the content, so the six-layer framework and the tools stay the center of attention.

**Key Characteristics:**
- Ink-on-cream, editorial restraint — paper warmth without ornament.
- Measurement language: grid-paper hero, hairline `0.5px` rules, inspection lens.

## Colors

The palette is warm-neutral with a disciplined three-tier accent system, expressed as light-theme hex values below. All neutrals carry a subtle warm tint; nothing is a pure gray.

### Primary
- **Blueprint Blue** (#185fa5): The single interaction accent. Used for links, focused states, the inspection lens and grid-accent lines, and info callouts. Rarest and most meaningful color in the system.

### Secondary
- **Field Green** (#3b6d11): Success and confirmation. Used for success callouts and positive status chips. Never competes with Blueprint Blue for interactive focus.

### Tertiary
- **Drafting Violet** (#534ab7): Tertiary emphasis. Used sparingly for the tertiary layer markers and tertiary-level chips. The quietest accent.

### Neutral
- **Paper White** (#ffffff): Base page background and the lightest surface.
- **Warm Paper** (#f4f3ef): Secondary surface — tool cards, raised panels.
- **Parchment** (#eceae4): Deepest paper tone — hero background, footer. Supplies most of the "paper" warmth.
- **Ink** (#1a1a18): Primary text and the filled primary button. Near-black with a warm cast.
- **Stone** (#56564f): Secondary text and body-level description.
- **Slate** (#8a8a82): Tertiary/label text, eyebrow labels, and unobtrusive metadata.
- **Ice Blue Wash** (#e6f1fb): Info callout background pairing with Blueprint Blue.
- **Leaf Wash** (#eaf3de): Success callout background pairing with Field Green.

Borders and dividers are translucent Ink (`rgba(26,26,24,.09/.20/.38)`) rather than solid gray, so they read as hairlines printed onto the paper. The dark layer inverts the relationship: cream becomes near-black charcoal (`#1e1e1b` base, `#292926` / `#323230` panels), ink becomes warm ivory (`#f0ede5`), and the accents shift to lighter, higher-chroma counterparts (`#85b7eb`, `#97c459`, `#afa9ec`) so they keep legibility on dark paper.

### Named Rules

**The Workbench Rule.** One interaction accent at a time. Blueprint Blue is the only color that signals "do something"; green and violet signal outcome and tier, never primary interaction.

## Typography

**Display Font:** Fraunces (with Georgia / "Times New Roman" / serif fallbacks)
**Body Font:** Source Sans 3 (with "Segoe UI" / Helvetica / Arial / sans-serif fallbacks)
**Mono Font:** IBM Plex Mono (with "SF Mono" / Consolas / monospace fallbacks)

**Character:** The pairing is editorial and disciplined — a warm, softly optical serif for identity and headings, a quiet faithful humanist sans for long-form body, and a technical monospace that names the tokens themselves. Fraunces is always served with optical sizing auto and tight tracking so it reads crafted rather than decorative.

### Hierarchy
- **Display** (Fraunces 600, `clamp(2.35rem, 6.2vw, 3.65rem)`, line-height 1.08, tracking -0.02em): The hero brand statement. Max width ~14ch.
- **Headline** (Fraunces 600, `clamp(1.55rem, 3.2vw, 1.9rem)`, line-height 1.2, tracking -0.015em): Section titles.
- **Title** (Fraunces 600, `1.2rem`, line-height 1.3): Card and tool titles.
- **Body** (Source Sans 3 400, `1rem` at 17px base, line-height 1.55): Long-form reading; descriptions use Stone at `0.92–1.02rem`.
- **Label/Eyebrow** (Source Sans 3 600, `12px`, tracking `0.1em`, uppercase): Section eyebrows and metadata.
- **Mono** (IBM Plex Mono 500, `11–12px`): Layer indices, token names, axis values, step numbers. Any representation of a token value always uses mono.

### Named Rules

**The Mono Means Token Rule.** If a string is a token, a layer index, or a measurement, it is typeset in IBM Plex Mono. Optical sans text means human prose; mono means system vocabulary.

- Serif display for identity + humanist sans for reading + mono for tokens.
- Three-tier accent discipline: blue (primary/info), green (success), violet (tertiary).
- Flat depth: tonal paper layering and soft hover shadows instead of heavy elevation.
- Full automatic dark layer and `prefers-reduced-motion` support.

## Layout

Content sits in a centered fixed-width ladder: standard sections at `720px`, feature/framework and tools sections at the wider `880px`, with page padding `0 1.5rem`. Sections stack vertically with `3.25rem` top/bottom padding and are separated by single `0.5px` hairline rules. The hero delivers the workbench metaphor: a `28px` grid-paper background masked to a circular `22vw` lens that follows the pointer (respecting reduced motion), with the paper sharply torn at its lower edge.

Vertical rhythm is rem-based and consistent — `0.65rem` between a label and title, `0.75rem` between a title and body, `0.85–0.9rem` between stacked descriptions, `1.5rem–1.75rem` before a list or action group. On narrow viewports (≤`560px`), grid rows that pair a number, name, description, and action collapse so the action drops beneath the text rather than crowding it.

### Named Rules

**The Hairline Rule.** Rules and borders are `0.5px` translucent Ink strokes, never solid heavy borders. The page reads as measured on paper, not framed in boxes.

## Elevation & Depth

The system is essentially flat; depth is achieved through tonal paper layering and restrained, diffused hover shadows rather than pronounced elevation. Rising through the surfaces: Paper White base → Warm Paper cards → Parchment hero/footer. Element hover lifts gently with a soft shadow (`0 8px 24px rgba(26,26,24,.06)`) and a `-2px` translate; dark mode swaps the shadow to `rgba(0,0,0,.25)` and the tear-edge paper motif drops a faint cast shadow. The torn-paper edges are a paper-craft texture that ties the surfaces together; per the confirmed direction they are kept subtle and never become the focal point.

## Shapes

Corners are mild and friendly but unadorned: `8px` for buttons and small chips, `12px` for cards and large panels, with small `4–6px` radii on tiny chips and pill-markers. Step markers in the "how to use" path are small circular mono badges, echoing measurement dots on a blueprint. The dominant shape language is the soft rectangle with a hairline border and gentle `8–12px` radius.



## Components

### Buttons
- **Primary Button:** filled Ink on Paper White, `8px` radius, `0.7rem 1.15rem` padding, Source Sans 3 600 at 15px. Hover inverts to transparent Ink on paper with the hairline border (`rgba(26,26,24,.38)`); active returns flat. Always paired with an arrow or short verb.
- **Secondary Button:** transparent, Ink text, `0.5px` Hairline border. Hover fills with Paper White and deepens the border.

### Tool Card
The signature surface for listing tools. Warm Paper fill, `12px` radius, `0.5px` hairline border, `1.1rem 1.2rem` padding, `0.65rem` gap below a meta row (uppercase tag + mono layer chip). Hover raises `-2px` with the soft shadow; the trailing arrow nudges right and recolors to Blueprint Blue.

### Layer Row
A numbered row (mono `01–06`), a serif layer name, and a description on a shared hairline beneath. Rows with a matching tool carry a subtle "tool →" text link that gets a Blueprint Blue wash on hover.

### How-to Path
A numbered step list with small circular mono badges (9px) sitting on a vertical hairline, each badge numbered and the step's lead phrase set in semibold.

### Handbook Link
A Warm Paper row with a strong label, a supporting caption, and a trailing arrow; hover recolors the arrow to Blueprint Blue.

### Input (workshop exercises)
Synthesized from the same tokens for the interactive tools: Paper White or Warm Paper field, `1px` Hairline border, `8px` radius, Source Sans 3 body, mono placeholder for token values, Blueprint Blue focus ring, and a status treatment (Ice Blue Wash / Field Green / a red danger on a matching tint).

## Do's and Don'ts

### Do:
- **Do** keep one interaction accent (Blueprint Blue) per screen; let Ink and Paper carry everything else.
- **Do** typeset tokens, layer indices, and measurements in IBM Plex Mono.
- **Do** use hairline `0.5px` translucent borders and gentle `8–12px` radii for the quiet, paper feel.
- **Do** respect `prefers-color-scheme` (ship the dark layer) and `prefers-reduced-motion` (collapse reveals).
- **Do** keep the torn-paper edges subtle and supporting, never the focal point.

### Don't:
- **Don't** introduce competing accent colors or gradients that pull focus from Blueprint Blue.
- **Don't** use heavy shadows or strong elevation; depth comes from tonal paper layering.
- **Don't** render prose or token values with decorative, hard-to-read weights (Fraunces is display-only, 500–700).
- **Don't** place multiple interactive calls-to-action at equal emphasis on a single surface.
