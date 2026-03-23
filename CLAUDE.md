# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@hunghoang3011/minimax-coding-helper` is a Node.js CLI tool that configures Claude Code and VS Code's Claude extension to use the MiniMax-M2.5 model via MiniMax's Anthropic-compatible API. It works by setting environment variables (notably `ANTHROPIC_BASE_URL`) to redirect Claude Code API calls from Anthropic's servers to MiniMax's endpoint.

CLI binaries: `minimax-helper` and `mmhelper` (both point to `bin/cli.js`).

## Build & Run

```bash
npm run build        # TypeScript compilation (tsc) → dist/
npm run dev          # Watch mode (tsc --watch)
npm start            # Run compiled CLI (node dist/cli.js)
npm publish          # Triggers prepublishOnly → build before publish
```

No test framework, linter, or bundler is configured. Build is plain `tsc` with CommonJS output.

## Architecture

### Entry Point Chain

`bin/cli.js` (CommonJS shim) → `dist/cli.js` (compiled from `src/cli.ts`)

`src/cli.ts` defines the Commander-based CLI with these commands:
- **default action / `init`** → `runInitWizard()` — interactive onboarding
- **`config`** → interactive configuration management menu
- **`doctor`** → system health diagnostics (8 checks)
- **`auth`** subcommand group: `set`, `show`, `revoke`, `apply`, `unload`, `path`, `mcp enable`, `mcp disable`

### Config Files Managed (on user's system)

| File | Format | Purpose |
|------|--------|---------|
| `~/.minimax-helper/config.yaml` | YAML | Stores API key, region, model, timeout |
| `~/.claude/settings.json` | JSON | Claude Code env vars (ANTHROPIC_BASE_URL, etc.) |
| `~/.claude.json` | JSON | MCP server definitions |
| `~/.vscode/settings.json` | JSON | VS Code Claude extension config |

### Core Module: `src/utils/config.ts`

The backbone of the project. Manages all four config files above. Key patterns:
- `loadConfig()` / `saveConfig()` — YAML-based MiniMax config
- `loadClaudeSettings()` / `saveClaudeSettings()` — merges with existing Claude settings (never overwrites unrelated keys)
- `getClaudeEnvConfig()` — generates the env var map that redirects Claude Code to MiniMax
- `backupClaudeSettings()` / `restoreClaudeSettings()` — timestamped backup management
- `enableMCP()` / `disableMCP()` — manages MiniMax MCP server entry
- `applyVSCodeExtensionConfig()` / `removeVSCodeExtensionConfig()` — VS Code extension integration

### Key Constants (in `src/utils/config.ts`)

- International base URL: `https://api.minimax.io/anthropic`
- China base URL: `https://api.minimaxi.com/anthropic`
- Default model: `MiniMax-M2.7`
- All Claude model env vars (`ANTHROPIC_MODEL`, `ANTHROPIC_SMALL_FAST_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`) are set to the same model.

### Command Modules (`src/commands/`)

- **`auth.ts`** — largest module; handles API key CRUD, applying/unloading config, MCP enable/disable. Uses `child_process.exec` for shell commands (`which uvx`, `claude mcp add`).
- **`init.ts`** — full-screen interactive onboarding wizard with recursive menu navigation.
- **`config.ts`** — interactive dashboard showing current status with action menu.
- **`doctor.ts`** — runs 8 sequential health checks (Node version, platform, config files, Claude installation, API connectivity via `fetch`). Exits with code 1 on failure.

### UI Utilities: `src/utils/logger.ts`

Wraps `chalk` and `ora` into `logger` (info/success/warning/error/title), `createSpinner()`, `printBox()`, and `printTable()`.

## Code Conventions

- TypeScript with strict mode, targeting ES2020
- CommonJS module output (`module: commonjs` in tsconfig)
- Source imports use `.js` extensions (e.g., `from './commands/init.js'`) — required for TypeScript CommonJS resolution
- Dependencies: `commander` for CLI, `inquirer` for prompts, `chalk`/`ora` for terminal UI, `js-yaml` for YAML, `fs-extra` for filesystem
- `src/index.ts` is a barrel re-export for library usage
