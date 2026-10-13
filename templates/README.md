# templates

Starting points for `pnpm proto:new <slug> --template <name>`:

| Template | What it is |
|---|---|
| `vanilla-ts` | Plain TypeScript + `@proto/ui`, hash routing. Default. |
| `three-gsap` | three.js scene via `@proto/three-kit`, GSAP via `@proto/motion`, self-hosted decoders. |
| `react-r3f` | React 19 + React Three Fiber + drei. |

Placeholders replaced by the CLI: `{{slug}}`, `{{version}}` (only in package.json: copies of a version keep text as is), `{{title}}`. Templates are not workspace packages;
they become one when copied into `prototypes/<slug>/versions/<vN>/`.
