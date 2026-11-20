# Tier 2 · Semantic Naming Convention

## Axes

1. **category** (required)
2. **family**
3. **role**
4. **emphasis**
5. **state**

## Formula

```
[category]-[family]-[role]-[emphasis]-[state]
```

## Categories

### color

- **Token type**: `color`
- **family** (branched)
  - **brand**
    - **Token type**: _not set_
    - **role** (branched)
      - **surface**
        - **Token type**: _not set_
        - **emphasis** (Custom list): [default], strong
        - **state** (Custom list): [default], hover
      - **text**
        - **Token type**: _not set_
        - **emphasis** (Custom list): subtle, [default]
        - **state** (Unused): _skipped_
  - **feedback**
    - **Token type**: _not set_
    - **Combination rules**: 1 generated, 1 explicit
      - Generated rule 1 (2 combinations): role=text; state=[default], disabled
      - Explicit: role=icon; state=[default]

### typography

- **Token type**: `typography`
- **family** (branched)
  - **heading**
    - **Token type**: `typography`
    - **Combination rules**: 1 generated, 1 explicit
      - Generated rule 1 (2 combinations): role=xl, lg; emphasis=[default]
      - Explicit: role=md; emphasis=strong
  - **weight**
    - **Token type**: `fontWeight`
    - **role** (Custom list): regular, bold
    - **emphasis** (Unused): _skipped_
    - **state** (Unused): _skipped_

---

*Generated with the Tier 1/2 Naming Builder — Design System Workshop*
