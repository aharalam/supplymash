---
name: ui-motion-references
description: Source animation, motion, and polished UI patterns from vetted libraries and galleries when building or polishing judge-facing UI.
---
# UI Motion References

Use when building or polishing judge-facing UI that benefits from animation or motion. Check these sources **before** hand-writing an effect, and pair with `impeccable` (design direction) and `web-design-guidelines` (review). Motion supports the demo; never let it delay the working slice, break accessibility, or hide real behavior.

## Sources
| Source | Use for | How |
| --- | --- | --- |
| [Motion](https://motion.dev) (`npm install motion`) | The animation engine: springs, layout, gestures, scroll, `AnimatePresence` exit animations. React, vanilla JS, Vue. Free and open source. | Default library for any custom motion. Docs: motion.dev/docs; examples: motion.dev/examples. Its AI Kit (motion.dev/ai-kit) gives agents current docs and examples. Motion+ components are paid; use only if the team has access. |
| [Kokonut UI](https://kokonutui.com) | Copy-paste animated React components (shadcn + Tailwind + Motion): backgrounds, AI inputs/loaders, particle/gradient buttons, bento, text effects. | `npx shadcn@latest add @kokonutui/<name>`. Agent docs: kokonutui.com/docs/agents.md; registry: kokonutui.com/r/registry.json; full docs: kokonutui.com/llms-full.txt. Some components are Pro/paid. |
| [Bklit UI](https://ui.bklit.com) | Animated chart components for data-heavy demos. | `npx shadcn@latest add @bklit/<chart>`. Docs: ui.bklit.com/docs. The shadcn components are MIT; Bklit Studio is proprietary, so do not copy it. |
| [Vividsites](https://www.vividsites.app) | Inspiration for cinematic, motion-heavy landing pages (GSAP, Three.js, Lenis, WebGL). Each template ships a build prompt. | Browse for direction and techniques. Pro templates are paid, so use only what the team has licensed and do not clone a template wholesale. |

## Rules
1. Prefer Motion plus a registry component over custom animation code. Reuse an existing component before writing a new one.
2. Fit the stack. These sources assume React, Tailwind, and shadcn; for any other stack use Motion's vanilla or Vue API and take only the idea.
3. Check the license and paid status before copying. Attribute where the license requires it. Do not claim copied work as original, and mind event rules on pre-existing code.
4. One or two high-impact moments (hero, core demo interaction, loading and result states) beat motion everywhere.
5. Honor `prefers-reduced-motion`, avoid layout shift, and keep the demo path fast and reliable on the actual demo device.
6. Fetch each source's current docs instead of relying on memory; component names and APIs change.

Last vetted: 2026-10-24. Not yet verified: an official "Manus" component library (none found; if the team means a specific site, add it here).
