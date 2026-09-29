# Working in this repo

## Commit messages

Every commit follows Conventional Commits. No exceptions, including agent commits.

```
<type>(<scope>): <description>

[body]

[footer]
```

- `type` is one of: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- `scope` is optional. Use the area touched: core, server, registry, client, installed, find, reader, dashboard, settings, readme, deps
- `description` is imperative, lowercase, no trailing period, under 72 characters. "add", not "added" or "adds"
- Body explains why, not what. Wrap at 72. Only add one when the diff does not explain itself
- Breaking change: add `!` after the type or scope and a `BREAKING CHANGE:` footer
- One logical change per commit. Do not mix a fix with a refactor

Before committing: run `git status` and `git diff --staged`, stage only what belongs to this change, then commit.

## Verify before you push

```sh
npm test
npm run typecheck
paseo plugin reload skill-manager && paseo plugin ls skill-manager   # must say running
```

## Layout

This is a Paseo plugin. The directory is the runtime boundary; Paseo refuses to compile
an import across it.

- `index.server.ts`, `server/` daemon subprocess: Node APIs, filesystem, git, network
  - `server/core` pure filesystem and git logic, no Paseo imports, unit tested
  - `server/registry.ts` skills.sh and GitHub lookups
- `index.client.tsx`, `client/` the Skills page and settings screen. React Native only:
  no HTML elements, `className`, `onClick` or DOM globals; colours from `theme.colors`
- `shared/` Zod RPC contracts and the settings document, imported by both

RPC outputs are validated with Zod: never emit an undefined-valued key. Use conditional spreads.
