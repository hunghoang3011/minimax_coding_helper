<div align="center">

  <!-- Logo -->
  <img src="https://raw.githubusercontent.com/hunghoang3011/minimax-coding-helper/main/assets/logo.png" alt="MiniMax Coding Helper" width="120" height="120">

  <!-- Title -->
  # 🤖 MiniMax Coding Helper

  <!-- Badges -->
  [![npm version](https://badge.fury.io/js/%40hunghoang3011%2Fminimax-coding-helper.svg)](https://www.npmjs.com/package/@hunghoang3011/minimax-coding-helper)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/node/v/@hunghoang3011/minimax-coding-helper.svg)](https://nodejs.org)
  [![Downloads](https://img.shields.io/npm/dm/@hunghoang3011/minimax-coding-helper.svg)](https://www.npmjs.com/package/@hunghoang3011/minimax-coding-helper)

  <!-- Description -->
  **🚀 The ultimate CLI helper for MiniMax Coding Plan users to configure Claude Code with the powerful MiniMax-M2.7 model**

  [Features](#-features) • [Quick Start](#-quick-start) • [Commands](#-commands) • [Configuration](#-configuration) • [FAQ](#-faq)

</div>

---

## ✨ Features

- **🎯 Interactive Wizard** - User-friendly onboarding with step-by-step guidance
- **⚡ MiniMax-M2.7 Integration** - Harness the power of MiniMax's advanced coding model in Claude Code
- **🔌 MCP Support** - Enable MiniMax's native MCP tools (`web_search`, `understand_image`)
- **🔐 Secure API Key Management** - Your API keys are stored locally and encrypted
- **🌍 Multi-Region Support** - Choose between International and China regions for optimal performance
- **🔍 Health Check System** - Built-in `doctor` command to diagnose and fix configuration issues
- **💾 Local Storage** - All settings stored securely on your machine - no cloud dependencies
- **🎨 Beautiful CLI Interface** - Modern, colorful terminal experience with emojis and rich formatting
- **🔄 Quick Config Menu** - Easy configuration refresh, unload, and API key changes

## 📋 Prerequisites

Before you begin, ensure you have the following:

- **Node.js** 18 or later ([Download](https://nodejs.org/))
- **Claude Code CLI** installed ([Get it here](https://claude.ai/download))
- **MiniMax API Key** ([Get one free](https://platform.minimax.io/))

## 🚀 Installation

### Option 1: Run with npx (Recommended) 🌟

No installation required! Just run:

```bash
npx @hunghoang3011/minimax-coding-helper
```

### Option 2: Install Globally 📦

```bash
npm install -g @hunghoang3011/minimax-coding-helper
```

Then run:

```bash
minimax-helper
# or use the short alias
mmhelper
```

## 🎯 Quick Start

Get up and running in under 2 minutes:

### 1️⃣ Run the Setup Wizard

```bash
mmhelper init
```

### 2️⃣ Enter Your API Key

You'll be prompted for your MiniMax API key. Don't have one? [Get it here](https://platform.minimax.io/)

### 3️⃣ Select Your Region

Choose your region:
- **🌍 International** - For users outside China
- **🇨🇳 China** - For users in China

### 4️⃣ Restart Claude Code

If Claude Code is running, restart it to apply the changes.

### 5️⃣ Start Coding! 🎉

```bash
claude
```

That's it! You're now using MiniMax-M2.7 in Claude Code.

---

## 🔌 MCP (Model Context Protocol)

MiniMax Coding Plan provides exclusive MCP tools to enhance your AI coding experience:

### Available MCP Tools

| Tool | Description | Use Case |
|------|-------------|----------|
| 🔍 **web_search** | Search the web for real-time information | Look up documentation, news, and resources |
| 🖼️ **understand_image** | Analyze and understand images | Extract text, analyze diagrams, interpret screenshots |

### Enable MCP

#### Option 1: Using Config Menu (Recommended)

```bash
mmhelper config
# Select "MCP Management"
# Select "Enable MCP"
```

#### Option 2: Using CLI Command

```bash
mmhelper auth mcp enable
```

### Disable MCP

```bash
mmhelper config
# Select "MCP Management"
# Select "Disable MCP"
```

Or use CLI:

```bash
mmhelper auth mcp disable
```

### MCP Requirements

- **uvx** must be installed (Python package runner)
- MiniMax API key with Coding Plan subscription

#### Install uvx

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Verify MCP Installation

After enabling MCP, restart Claude Code and run:

```bash
/mcp
```

You should see `web_search` and `understand_image` in the list of available tools.

---

## 📚 Commands

### 🎬 `mmhelper init`

Run the interactive setup wizard.

```bash
mmhelper init
```

**Perfect for:** First-time setup

---

### ⚙️ `mmhelper config`

**NEW!** Interactive configuration menu for quick management.

```bash
mmhelper config
```

**Options:**
- 🔄 **Configuration Refresh** - Reapply MiniMax settings to Claude Code
- 🗑️ **Unload Configuration** - Remove MiniMax from Claude Code (keeps API key)
- 🔑 **Change API Key** - Update your API key
- ❌ **Exit** - Close the menu

**Perfect for:** Quick configuration management

---

### 🔐 `mmhelper auth`

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

# Enable MCP (web_search, understand_image)
mmhelper auth mcp enable

# Disable MCP
mmhelper auth mcp disable
```

**Perfect for:** Advanced configuration management

---

### 🏥 `mmhelper doctor`

Run system health check to diagnose issues.

```bash
mmhelper doctor
```

**Perfect for:** Troubleshooting configuration problems

---

### ❓ `mmhelper --help`

Show all available commands.

```bash
mmhelper --help
```

---

## ⚙️ Configuration

### 📁 Storage Locations

The helper stores configuration in multiple locations:

| Location | Path | Purpose |
|----------|------|---------|
| **MiniMax Config** | `~/.minimax-helper/config.yaml` | API key and region settings |
| **Claude Code Settings** | `~/.claude/settings.json` | MiniMax API endpoints |
| **Claude MCP Config** | `~/.claude.json` | MCP server configuration |

### 🔧 Claude Code Environment Variables

When you apply MiniMax configuration, these environment variables are set:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.minimax.io/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<your-api-key>",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "ANTHROPIC_MODEL": "MiniMax-M2.7",
    "ANTHROPIC_SMALL_FAST_MODEL": "MiniMax-M2.7",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "MiniMax-M2.7",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "MiniMax-M2.7",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "MiniMax-M2.7"
  }
}
```

### 🌍 Region Configuration

Choose the region that matches your location:

| Region | Base URL | Best For | Latency |
|--------|----------|----------|---------|
| 🌍 **International** | `https://api.minimax.io/anthropic` | Users outside China | Lower outside China |
| 🇨🇳 **China** | `https://api.minimaxi.com/anthropic` | Users in China | Lower in China |

---

## ⚠️ Important Notes

### 🔴 Clear Anthropic Environment Variables

Before configuring MiniMax, ensure you **clear** these environment variables to avoid conflicts:

```bash
unset ANTHROPIC_AUTH_TOKEN
unset ANTHROPIC_BASE_URL
```

### 💾 Automatic Backup

The helper **automatically backs up** your original Claude Code settings before applying MiniMax configuration.

**Backup location:** `~/.minimax-helper/backups/`

---

## 🔑 Getting Your API Key

1. Visit [https://platform.minimax.io/](https://platform.minimax.io/)
2. Sign up or log in
3. Navigate to the **API** section
4. Generate a new API key
5. Copy the key and use it with this helper

---

## 🔍 Troubleshooting

### ❓ Claude Code doesn't use MiniMax

**Solution:**
1. Run `mmhelper doctor` to check configuration
2. Make sure you've run `mmhelper auth apply`
3. **Restart Claude Code completely**
4. Check that `ANTHROPIC_BASE_URL` is not set in your shell environment

### ❓ API errors occur

**Solution:**
1. Verify your API key: `mmhelper auth show`
2. Check you selected the correct region
3. Ensure you have API quota on [MiniMax Platform](https://platform.minimax.io/)

### ❓ Claude Code not found

**Solution:**

Install Claude Code from the official website: [https://claude.ai/download](https://claude.ai/download)

### ❓ Permission denied errors

**Solution:**

```bash
# Fix Claude Code settings permissions
chmod 644 ~/.claude/settings.json
```

---

## 📖 Usage Examples

### Basic Setup

```bash
# Interactive setup
mmhelper init

# Or use the new config menu
mmhelper config
```

### Enable MCP Tools

```bash
# Option 1: Use the config menu (recommended)
mmhelper config
# Select "MCP Management"
# Select "Enable MCP"

# Option 2: Use auth command
mmhelper auth mcp enable
```

### Change API Key

```bash
# Option 1: Use the config menu (recommended)
mmhelper config

# Option 2: Use auth command
mmhelper auth set
```

### Refresh Configuration

```bash
# Option 1: Use the config menu (recommended)
mmhelper config
# Select "Configuration Refresh"

# Option 2: Use auth command
mmhelper auth apply
```

### Remove MiniMax (Temporary)

```bash
mmhelper config
# Select "Unload Configuration"
# Choose to keep API key for future use
```

### Remove MiniMax (Permanent)

```bash
mmhelper auth revoke
```

---

## 📚 Resources

- [MiniMax Platform](https://platform.minimax.io/) - Get your API key
- [MiniMax Documentation](https://platform.minimax.io/docs) - Official docs
- [Claude Code](https://claude.ai/download) - Download Claude Code
- [GitHub Repository](https://github.com/hunghoang3011/minimax-coding-helper) - Source code
- [Report Issues](https://github.com/hunghoang3011/minimax-coding-helper/issues) - Bug reports

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👨‍💻 Author

**hunghoang3011**

- GitHub: [@hunghoang3011](https://github.com/hunghoang3011)
- Email: [Contact me](https://github.com/hunghoang3011)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ⭐ Show Your Support

If you find this project helpful, please consider giving it a ⭐ on [GitHub](https://github.com/hunghoang3011/minimax-coding-helper)!

---

<div align="center">

**Made with ❤️ by [hunghoang3011](https://github.com/hunghoang3011)**

[⬆ Back to Top](#-mini-max-coding-helper)

</div>
