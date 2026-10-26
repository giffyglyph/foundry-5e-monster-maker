---
version: "0.1.2"
level: copilot
processes:
  design: hint
  implementation: assist
  testing: copilot
  documentation: pair
  review: hint
  deployment: copilot
---

This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/0.1.2).

## Notes

- The global `copilot` level comes from `testing` and `deployment`. The shipped module code sits lower. `implementation` is `assist`. `design` and `review` are `hint`.
- Claude Code is the assistant used. The wider instruction set under `CLAUDE.md` and `.claude/` is gitignored. A clone of this repository does not contain it.
- Claude Code wrote parts of the production code under `scripts/`. Architecture and design decisions are the author's.
- The release workflows in `.github/workflows/`, the pack tooling in `tools/`, and the pre-commit gates in `.githooks/` were AI-drafted.
- The Playwright regression suite behind the `testing` level is not in this repository.
- `scripts/vendors/math.min.js` is third-party. This declaration does not cover it.
- `gmm.css` is build output. Gulp compiles it from `stylesheets/*.scss`.
