# Tier 2 · Semantic Naming Convention

## Axes

1. **namespace** (optional)
2. **category** (required)
3. **family**
4. **variant**
5. **role**
6. **prominence**
7. **scale** (optional)
8. **state**

## Formula

```
[namespace]-[category]-[family]-[variant]-[role]-[prominence]-[scale]-[state]
```

## Namespace

**mds** (global — applies to all tokens)

## Categories

### color

- **Token type**: `color`
- **family** (Custom list): brand, feedback, neutral
- **variant** (Custom list): _none_
  - when family = brand (Custom list): primary, secondary, accent
  - when family = feedback (Custom list): critical, caution, positive, info
- **role** (Custom list): container, on-container, text, icon, border
  - when family = feedback (Custom list): container, text, icon
- **prominence** (Custom list): [base], bold, subtle
- **scale** (Unused): _skipped_
- **state** (Custom list): [default], hover, focus, active, disabled

### space

- **Token type**: `dimension`
- **family** (Custom list): inset, stack, inline
- **variant** (Unused): _skipped_
- **role** (Unused): _skipped_
- **prominence** (Unused): _skipped_
- **scale** (T-shirt sizes): xs, sm, md, lg, xl
- **state** (Unused): _skipped_

---

*Generated with the Tier 1/2 Naming Builder — Design System Workshop*
