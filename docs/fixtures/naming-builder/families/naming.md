# Tier 1 · Primitive Naming Convention

## Axes

1. **namespace** (optional)
2. **category** (required)
3. **family**
4. **scale** (required — final axis)

## Formula

```
[namespace]-[category]-[family]-[scale]
```

## Namespace

**ds** (global — applies to all tokens)

## Categories

### border

- **Token type**: `dimension`
- **family** (Custom list): radius, width
- **scale** (Custom list): _none_
  - when family = radius (T-shirt sizes): xs, sm, md, lg, xl
  - when family = width (Numeric range): 1, 2, 3, 4

---

*Generated with the Tier 1/2 Naming Builder — Design System Workshop*
