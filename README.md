<p align="center">
  <img src="docs/logo.svg" width="112" alt="Skill Manager logo" />
</p>

<h1 align="center">Skill Manager for Paseo</h1>

<p align="center"><strong>All your agent skills, one place, inside Paseo.</strong></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="MIT" /></a>
  <a href="https://skills.sh"><img src="https://img.shields.io/badge/registry-skills.sh-2ea44f" alt="skills.sh" /></a>
</p>

A [Paseo](https://paseo.sh) port of [bb-skill-manager](https://github.com/sankalpaacharya/bb-skill-manager).

Claude Code, Codex, Pi, OpenCode, Gemini, Cursor, Copilot. Each one keeps its own skills folder, so you end up with the same skill copied everywhere and slowly going out of sync.

Skill Manager fixes that. One hub, every agent linked to it, updates in one click.

## Install

Turn on **Settings → Plugins → Enable plugins**, then:

```sh
paseo plugin install github:pratyay2374/paseo-skill-manager
```

Then open **Skills** in the sidebar. Requires Paseo 0.10.1 or newer.

## What you get

- One hub for every skill, every agent linked to it
- See which agent has what, and what drifted
- Search skills.sh and install into the agents you pick
- Knows where each skill came from, tells you when there's an update
- Tags, grouping by source, read any skill in place
- Works on desktop and mobile Paseo clients, in every theme

Tap a skill to see its details: read it, tag it, check for updates, and link, copy, diff, adopt or remove it per agent.

## Settings

**Settings → Plugins → skill-manager → Skills**

| Setting | Default |
| --- | --- |
| Hub folder | `~/.agents/skills` |
| Install as | Link |
| Hidden agents | |
| More agents | `[]` |

## Differences from the BB plugin

- **No `bb skill-manager` CLI.** Paseo plugins cannot add CLI commands.
- **Find skills starts empty.** The public skills.sh API has no trending list and needs a query of two or more characters.
- **No summaries or topics** in search results; the public API does not return them.
- **Files show as plain text** in the reader; Paseo gives plugins no Markdown renderer.
- **Agent logos are built in.** Paseo does not share its provider artwork with plugins, so the plugin carries its own copies of Paseo's logos (Apache-2.0), tinted to the theme. Agents you add in settings show the first two letters of their name.
- **Registry figures are rate-limited.** Download counts come from skills.sh and star counts from GitHub's API, which allows 60 unauthenticated requests an hour. The plugin backs off when either says slow down. Set `GITHUB_TOKEN` in the daemon's environment for a higher GitHub limit.
- **Windows works.** Links are directory junctions, which need no admin rights.

Plugin state (tags, cached update checks and registry figures) lives in `$PASEO_HOME/plugin-data/skill-manager/state.json`.

## Dev

```sh
npm install
npm test
npm run typecheck
paseo plugin install "$PWD"
paseo plugin reload skill-manager   # after each change
paseo plugin logs skill-manager
```

MIT
