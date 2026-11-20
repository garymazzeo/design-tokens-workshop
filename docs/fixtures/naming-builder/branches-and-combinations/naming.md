# Tier 1 · Primitive Naming Convention

## Axes

1. **namespace** (optional)
2. **category** (required)
3. **family**
4. **role**
5. **state**
6. **scale** (required — final axis)

## Formula

```
[namespace]-[category]-[family]-[role]-[state]-[scale]
```

## Namespace

**mds** (global — applies to all tokens)

## Categories

### color

- **Token type**: `color`
- **family** (branched)
  - **brand**
    - **Token type**: _not set_
    - **Combination rules**: 1 generated, 2 explicit
      - Generated rule 1 (8 combinations): role=surface, text; state=[default], hover; scale=100, 200
      - Explicit: role=border; state=pressed; scale=300
      - Explicit: role=surface; state=hover; scale=100
  - **feedback**
    - **Token type**: _not set_
    - **role** (Custom list): text, icon
    - **state** (Unused): _skipped_
    - **scale** (Custom list): [base], strong

### border

- **Token type**: `dimension`
- **family** (branched)
  - **radius**
    - **Token type**: `dimension`
    - **role** (Unused): _skipped_
    - **state** (Unused): _skipped_
    - **scale** (T-shirt sizes): 2xs, xs, sm, md, lg, xl, 2xl
  - **width**
    - **Token type**: `dimension`
    - **role** (Unused): _skipped_
    - **state** (Unused): _skipped_
    - **scale** (Numeric range): 1, 2, 3, 4
  - **style**
    - **Token type**: `strokeStyle`
    - **role** (Unused): _skipped_
    - **state** (Unused): _skipped_
    - **scale** (Custom list): solid, dashed

### space

- **Token type**: `dimension`
- **Combination rules**: 2 generated, 1 explicit
  - Generated rule 1 (2 combinations): family=inline; scale=4, 8
  - Generated rule 2 (3 combinations): family=stack; scale=8, 12, 16
  - Explicit: family=inline; scale=16

---

*Generated with the Tier 1/2 Naming Builder — Design System Workshop*
