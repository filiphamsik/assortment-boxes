# Assortment Box Generator

Configure a stackable small-parts box – or the drawer grid it sits on – in the browser, preview it
in 3D and download an STL for your 3D printer.

Boxes follow the [Small Parts Assortment System](https://www.printables.com/model/75204-small-parts-assortment-system)
(45 mm grid). Everything runs client-side; geometry is built with
[manifold-3d](https://github.com/elalish/manifold), so the STL is always manifold.

**Live:** https://filiphamsik.github.io/assortment-boxes/

## Parameters

- **Width × depth** in modules (1–6). Width runs along the wall with the label wedge, so
  2×1 and 1×2 differ in which way the label faces.
- **Height** in units of 33 mm (0.5–3, step 0.25). Heights add up when stacked:
  two 0.5 boxes are exactly as tall as one 1 box.
- **Label wedge** on/off, width 20–42.6 mm, optional raised lip.
- **Grid** 1–10 × 1–10 cells.
- **Advanced:** pitch, clearance, wall, floor, foot height, stack insertion, height unit.

## Development

```sh
npm install
npm run dev     # local dev server
npm test        # geometry tests (compared against the STLs in reference/)
npm run build   # static site in dist/
```

Design: [docs/superpowers/specs/2026-11-06-assortment-boxes-design.md](docs/superpowers/specs/2026-11-06-assortment-boxes-design.md)
