# X Books icon policy

X Books uses **Lucide** as its single application icon library. Every application icon must be exposed through [`src/icons.tsx`](src/icons.tsx), which is the semantic icon registry and the only file that imports from `lucide-react`.

## Selection

- Use an existing Lucide icon whenever it accurately represents the action, destination, status, or object.
- Map one concept to one canonical icon in `src/icons.tsx` and reuse that mapping everywhere.
- Do not draw a custom SVG, use an emoji, or substitute a Unicode symbol when Lucide provides a suitable icon.
- Do not add another icon library unless a documented technical requirement cannot be met by Lucide.
- CSS triangles used as select disclosures and CSS diamonds used as tooltip pointers are structural component shapes, not application icons.

## Visual contract

- X Books icons use a 24 px coordinate system, rounded caps and joins, no fill, and a standard `1.8` stroke width supplied by the registry.
- Use 20 px navigation icons, 18 px compact action icons, and 14–17 px inline directional icons unless a component specification requires otherwise.
- Keep icons optically centered and do not add decorative circles, backgrounds, or badges unless the component itself defines that surface.
- Directional icons must describe the actual physical action and use the paired RTL mapping from the registry when the interface direction changes.

## Accessibility

- Decorative icons are hidden from assistive technology by the registry.
- Icon-only controls require an accurate `aria-label`; tooltips supplement that label but never replace it.
- Labeled controls must keep visible text. Icons should clarify the action rather than become the only accessible name.

## Custom icon exception

A custom SVG is permitted only when no suitable Lucide icon exists, the concept is unique to X Books, and the custom artwork materially improves comprehension. Record the reason beside the registry entry and match Lucide's 24 px grid, `1.8` stroke, rounded caps and joins, spacing, and optical balance.
