# POS Interface System

## Direction
- Operative cashier interface, not admin dashboard.
- Dense and warm visual language inspired by physical checkout counters.
- Layout should feel like work zones: sale, customer, document/payment, product capture, detail grid, totals.
- Avoid long linear forms; prefer compact grouped blocks.

## Depth Strategy
- Use borders plus subtle surface color shifts.
- Main canvas: `#f4efe7`
- Inset warm surfaces: `#fbf7f1`, `#fffdf9`, `#fcfaf6`
- Borders: `rgba(205, 191, 173, 0.72)`
- Accent total card can stay strong and red for payment focus.

## Spacing
- Base unit: `8px`
- Dense POS sections should mostly use `gap: 1` and `gap: 1.25`
- Border radius scale:
  - Controls/chips: pill or small radius
  - Inset blocks: `18px`
  - Main panels: `22px`

## POS Patterns

### Top Bar
- Single compact header band.
- Primary cashier actions visible in toolbar.
- Secondary actions in overflow menu.
- Shortcut labels can appear directly in action text.

### Top Work Area
- Split into grouped operational blocks, not one continuous row.
- Preferred desktop grouping:
  - `Venta`
  - `Cliente`
  - `Documento y cobro`
- Product capture should live in its own band under those blocks.

### Product Capture
- Barcode/code input is the primary field and should keep focus.
- Manual search is secondary.
- Quantity and add actions remain in the same capture band.

### Detail Grid
- DataGrid is the dominant work surface.
- Keep surrounding chrome light so the table reads as the main task area.

### Right Panel
- Fixed payment-oriented column.
- Order:
  - total card
  - breakdown
  - payment lines
  - sale state
  - cash status
- This panel should support cashier decisions without opening other screens.

### Interaction
- Keyboard-first usage is preferred.
- Preserve focus on barcode input after common actions.
- Function keys may be used for high-frequency cashier actions.
