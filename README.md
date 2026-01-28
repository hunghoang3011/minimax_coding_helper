# MiniMax Coding Helper

[![npm version](https://badge.fury.io/js/%40minimax_coding%2Fhelper.svg)](https://www.npmjs.com/package/@hunghoang3011/minimax-coding-helper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A CLI helper for MiniMax Coding Plan Users to configure Claude Code with the MiniMax-M2.1 model.

## Author

**[hunghoang3011](https://github.com/hunghoang3011)**

GitHub: [@hunghoang3011](https://github.com/hunghoang3011)

## Features

- **Interactive wizard** - Friendly onboarding guidance on first launch
- **MiniMax-M2.1 integration** - Use MiniMax's powerful coding model in Claude Code
- **API key management** - Securely store and manage your MiniMax API key
- **Region selection** - Support for both International and China regions
- **Health check** - Verify your configuration with the `doctor` command
- **Local storage** - All settings are stored securely on your machine

## Prerequisites

- Node.js 18 or later
- Claude Code CLI installed ([install from here](https://claude.ai/download))
- MiniMax API key ([get one here](https://platform.minimax.io/))

## Installation

### Run directly with npx (Recommended)

```bash
npx @hunghoang3011/minimax-coding-helper
```

### Install globally

```bash
npm install -g @hunghoang3011/minimax-coding-helper
```

Then run:

```bash
minimax-helper
# or
mmhelper
```

## Quick Start

1. **Run the setup wizard:**

```bash
mmhelper init
```

2. **Enter your MiniMax API key** when prompted

3. **Select your region** (International or China)

4. **Restart Claude Code** if it's running

5. **Start coding!** Run `claude` in your project directory

## Commands

### `mmhelper init`

Run the interactive setup wizard.

```bash
mmhelper init
```

### `mmhelper auth`

Manage your MiniMax API authentication.

```bash
# Set API key interactively
mmhelper auth set

# Set API key directly
mmhelper auth set <your-api-key>

# Set API key for China region
mmhelper auth set <your-api-key> --region china

# Show current configuration
mmhelper auth show

# Apply MiniMax config to Claude Code
mmhelper auth apply

# Remove API key and restore original settings
mmhelper auth revoke

# Show configuration file paths
mmhelper auth path
```

### `mmhelper doctor`

Run system health check to diagnose issues.

```bash
mmhelper doctor
```

### `mmhelper --help`

Show all available commands.

```bash
mmhelper --help
```

## Configuration

The helper stores configuration in two locations:

1. **MiniMax Helper Config**: `~/.minimax-helper/config.yaml`
   - Stores your API key and region settings

2. **Claude Code Settings**: `~/.claude/settings.json`
   - Modified to use MiniMax API endpoints

### What gets configured in Claude Code?

When you apply the MiniMax configuration, the following environment variables are set in Claude Code's settings:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.minimax.io/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<your-api-key>",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "ANTHROPIC_MODEL": "MiniMax-M2.1",
    "ANTHROPIC_SMALL_FAST_MODEL": "MiniMax-M2.1",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "MiniMax-M2.1",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "MiniMax-M2.1",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "MiniMax-M2.1"
  }
}
```

## Region Configuration

Choose the appropriate region based on your location:

| Region | Base URL | Best For |
|--------|----------|----------|
| International | `https://api.minimax.io/anthropic` | Users outside China |
| China | `https://api.minimaxi.com/anthropic` | Users in China |

## Important Notes

### Clear Anthropic Environment Variables

Before configuring MiniMax, ensure you clear the following environment variables to avoid conflicts:

- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_BASE_URL`

### Backup

The helper automatically backs up your original Claude Code settings before applying MiniMax configuration. Backups are stored in `~/.minimax-helper/`.

## Getting Your API Key

1. Visit [https://platform.minimax.io/](https://platform.minimax.io/)
2. Sign up or log in
3. Navigate to the API section
4. Generate a new API key
5. Copy the key and use it with this helper

## Troubleshooting

### Claude Code doesn't use MiniMax

1. Run `mmhelper doctor` to check your configuration
2. Make sure you've run `mmhelper auth apply`
3. Restart Claude Code completely
4. Check that `ANTHROPIC_BASE_URL` is not set in your shell environment

### API errors

1. Verify your API key is correct: `mmhelper auth show`
2. Check that you selected the correct region
3. Ensure you have API quota available on the MiniMax platform

### Claude Code not found

Install Claude Code from the official website: https://claude.ai/download

## Links

- [MiniMax Platform](https://platform.minimax.io/)
- [MiniMax Documentation](https://platform.minimax.io/docs)
- [Claude Code](https://claude.ai/download)
- [GitHub Repository](https://github.com/hunghoang3011/minimax-coding-helper)

## License

MIT &copy; [hunghoang3011](https://github.com/hunghoang3011)
