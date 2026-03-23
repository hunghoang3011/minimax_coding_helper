import inquirer from 'inquirer';
import chalk from 'chalk';
import { authSet, authApply, authMCPEnable } from './auth.js';
import { loadConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export async function runInitWizard(): Promise<void> {
  while (true) {
    // Show welcome header
    logger.blank();
    console.log(chalk.cyan.bold('╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║') + chalk.white.bold('        🤖 MiniMax Helper for Claude Code                ') + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝'));
    logger.blank();

    // Check existing config
    const existingConfig = await loadConfig();
    const hasConfig = existingConfig && existingConfig.api_key;

    if (hasConfig) {
      const maskedKey = existingConfig.api_key!.slice(0, 4) + '****';
      console.log(chalk.white('  Current Configuration:'));
      console.log(chalk.cyan('  Coding Plan: ') + chalk.white.bold('MiniMax Coding Plan Global'));
      console.log(chalk.cyan('  API Key: ') + chalk.green('Set (' + maskedKey + ')'));
      logger.blank();
    }

    // Main menu
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold.cyan('Select operation:'),
        choices: [
          {
            name: chalk.cyan('🔑') + ' API Key - ' + chalk.white('Set your MiniMax API key'),
            value: 'api-key',
            short: 'API Key'
          },
          {
            name: chalk.yellow('🌍') + ' Coding Plan - ' + chalk.white('Select your coding plan region'),
            value: 'coding-plan',
            short: 'Coding Plan'
          },
          {
            name: chalk.green('🛠️ ') + ' Coding Tool - ' + chalk.white('Configure Claude Code integration'),
            value: 'coding-tool',
            short: 'Coding Tool'
          },
          new inquirer.Separator(),
          {
            name: chalk.gray('❌ Exit'),
            value: 'exit',
            short: 'Exit'
          }
        ]
      }
    ]);

    logger.blank();

    switch (action) {
      case 'api-key':
        await handleApiKey();
        continue;
      case 'coding-plan':
        await handleCodingPlan();
        continue;
      case 'coding-tool':
        await handleCodingTool();
        continue;
      case 'exit':
        console.log(chalk.gray('👋 Goodbye!'));
        break;
    }
    break;
  }
}

async function handleApiKey(): Promise<void> {
  logger.blank();
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('│') + chalk.white.bold('  🔑 API Key Configuration                                 ') + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
  logger.blank();

  const config = await loadConfig();

  if (config && config.api_key) {
    const maskedKey = config.api_key.slice(0, 4) + '****';
    console.log(chalk.white('  Current API Key: ') + chalk.green(maskedKey));
    logger.blank();

    const { changeKey } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'changeKey',
        message: 'Do you want to change your API key?',
        default: false
      }
    ]);

    if (!changeKey) {
      return;
    }
  }

  console.log(chalk.white('  Get your API key from: ') + chalk.cyan('https://platform.minimax.io/'));
  logger.blank();

  try {
    await authSet();
    logger.blank();
    console.log(chalk.green('  ✅ API Key configured successfully!'));
    await promptReturnToMenu();
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to set API key.'));
    await promptReturnToMenu();
  }
}

async function handleCodingPlan(): Promise<void> {
  logger.blank();
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('│') + chalk.white.bold('  🌍 Coding Plan Selection                                 ') + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
  logger.blank();

  const config = await loadConfig();

  if (config) {
    console.log(chalk.white('  Current Coding Plan: ') + chalk.cyan.bold(config.region === 'international' ? '🌍 MiniMax Coding Plan Global' : '🇨🇳 MiniMax Coding Plan China'));
    logger.blank();
  }

  const { region } = await inquirer.prompt([
    {
      type: 'list',
      name: 'region',
      message: chalk.bold.cyan('Select your coding plan:'),
      choices: [
        {
          name: '🌍 MiniMax Coding Plan Global - International',
          value: 'international'
        },
        {
          name: '🇨🇳 MiniMax Coding Plan China - China Region',
          value: 'china'
        }
      ],
      default: config?.region || 'international'
    }
  ]);

  // Save region
  if (config) {
    config.region = region;
    config.base_url = region === 'international'
      ? 'https://api.minimax.io/anthropic'
      : 'https://api.minimaxi.com/anthropic';

    const { saveConfig } = await import('../utils/config.js');
    await saveConfig(config);

    logger.blank();
    console.log(chalk.green('  ✅ Coding Plan updated successfully!'));
    await promptReturnToMenu();
  } else {
    console.log(chalk.yellow('  ⚠️  Please set your API key first.'));
    await promptReturnToMenu();
  }
}

async function handleCodingTool(): Promise<void> {
  logger.blank();
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('│') + chalk.white.bold('  🛠️  Coding Tool Configuration                              ') + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
  logger.blank();

  const config = await loadConfig();

  if (!config || !config.api_key) {
    console.log(chalk.yellow('  ⚠️  Please configure your API key first.'));
    await promptReturnToMenu();
    return;
  }

  const maskedKey = config.api_key.slice(0, 4) + '****';

  // Show current config
  console.log(chalk.white('  Chelper Configuration:'));
  console.log(chalk.cyan('  Coding Plan: ') + chalk.white.bold(config.region === 'international' ? '🌍 MiniMax Coding Plan Global' : '🇨🇳 MiniMax Coding Plan China'));
  console.log(chalk.cyan('  API Key: ') + chalk.green('Set (' + maskedKey + ')'));
  logger.blank();

  const { tool } = await inquirer.prompt([
    {
      type: 'list',
      name: 'tool',
      message: chalk.bold.cyan('Select coding tool to configure:'),
      choices: [
        {
          name: chalk.green('💻') + ' Claude Code - ' + chalk.white('Configure Claude Code integration'),
          value: 'claude-code',
          short: 'Claude Code'
        },
        new inquirer.Separator(),
        {
          name: chalk.gray('⬅️  Back'),
          value: 'back',
          short: 'Back'
        }
      ]
    }
  ]);

  logger.blank();

  if (tool === 'back') {
    return;
  }

  if (tool === 'claude-code') {
    await configureClaudeCode(config);
  }
}

async function configureClaudeCode(config: any): Promise<void> {
  logger.blank();
  console.log(chalk.yellow('  ⚠️  Warning: You are modifying the Claude Code global configuration.'));
  console.log(chalk.white('  Changes will affect all workspaces.'));
  logger.blank();

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.bold.yellow('Continue?'),
      default: true
    }
  ]);

  if (!confirm) {
    await handleCodingTool();
    return;
  }

  // Apply configuration
  try {
    await authApply();

    logger.blank();
    console.log(chalk.bold.cyan('  ╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('  ║') + chalk.white.bold('  ✅ Configuration synchronized                           ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('  ╚════════════════════════════════════════════════════════════╝'));
    logger.blank();

    // Ask about MCP
    const { enableMCP } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableMCP',
        message: 'Enable MCP (web_search & understand_image tools)?',
        default: true
      }
    ]);

    if (enableMCP) {
      await authMCPEnable();
    }

    await showActionMenu(config);
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to configure Claude Code.'));
    await promptReturnToMenu();
  }
}

async function showActionMenu(config: any): Promise<void> {
  while (true) {
    logger.blank();
    logger.blank();

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold.cyan('Select action:'),
        choices: [
          {
            name: chalk.green('🔄 Configuration Refresh') + ' - ' + chalk.gray('Update Claude Code\'s MiniMax configuration'),
            value: 'refresh',
            short: 'Configuration Refresh'
          },
          {
            name: chalk.red('🗑️  Unload Configuration') + ' - ' + chalk.gray('Remove MiniMax configuration from Claude Code'),
            value: 'unload',
            short: 'Unload Configuration'
          },
          {
            name: chalk.blue('🔌 MCP Configuration') + ' - ' + chalk.gray('Manage Model Context Protocol'),
            value: 'mcp',
            short: 'MCP Configuration'
          },
          {
            name: chalk.yellow('🏪 Plugin Marketplace') + ' - ' + chalk.gray('Browse and install plugins (Coming soon)'),
            value: 'marketplace',
            short: 'Plugin Marketplace'
          },
          new inquirer.Separator(),
          {
            name: chalk.cyan.bold('▶️  Start Claude Code') + ' - ' + chalk.gray('Open a new terminal and run: claude'),
            value: 'start-claude',
            short: 'Start Claude Code'
          },
          new inquirer.Separator(),
          {
            name: chalk.gray('❌ Exit'),
            value: 'exit',
            short: 'Exit'
          }
        ]
      }
    ]);

    logger.blank();

    switch (action) {
      case 'refresh':
        await authApply();
        continue;
      case 'unload':
        const { authUnload } = await import('./auth.js');
        await authUnload();
        continue;
      case 'mcp':
        await handleMCPMenu(config);
        continue;
      case 'marketplace':
        console.log(chalk.yellow('  🏪 Plugin Marketplace coming soon!'));
        await promptContinue();
        continue;
      case 'start-claude':
        console.log(chalk.cyan('  💡 To start Claude Code:'));
        console.log(chalk.white('     1. Open a new terminal in your workspace'));
        console.log(chalk.cyan('     2. Run: ') + chalk.white.bold('claude'));
        logger.blank();
        await promptContinue();
        continue;
      case 'exit':
        console.log(chalk.gray('👋 Goodbye!'));
        break;
    }
    break;
  }
}

async function handleMCPMenu(config: any): Promise<void> {
  while (true) {
    const { isMCPEnabled } = await import('../utils/config.js');
    const mcpEnabled = await isMCPEnabled();

    logger.blank();
    console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
    console.log(chalk.bold.cyan('│') + chalk.white.bold('  🔌 MCP Configuration                                      ') + chalk.bold.cyan('│'));
    console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
    logger.blank();

    const status = mcpEnabled ? chalk.green.bold('✅ Enabled') : chalk.gray('❌ Disabled');
    console.log(chalk.white('  MCP Status: ') + status);
    logger.blank();

    if (mcpEnabled) {
      console.log(chalk.gray('  Available Tools:'));
      console.log(chalk.cyan('    • ') + chalk.white('web_search') + chalk.gray(' - Search the web'));
      console.log(chalk.cyan('    • ') + chalk.white('understand_image') + chalk.gray(' - Analyze images'));
      logger.blank();
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold.cyan('MCP Management:'),
        choices: mcpEnabled ? [
          {
            name: chalk.red('🔴 Disable MCP') + ' - ' + chalk.gray('Remove MCP from Claude Code'),
            value: 'disable',
            short: 'Disable MCP'
          },
          new inquirer.Separator(),
          {
            name: chalk.gray('⬅️  Back'),
            value: 'back',
            short: 'Back'
          }
        ] : [
          {
            name: chalk.green('🟢 Enable MCP') + ' - ' + chalk.gray('Add web_search & understand_image'),
            value: 'enable',
            short: 'Enable MCP'
          },
          new inquirer.Separator(),
          {
            name: chalk.gray('⬅️  Back'),
            value: 'back',
            short: 'Back'
          }
        ]
      }
    ]);

    logger.blank();

    switch (action) {
      case 'enable':
        await authMCPEnable();
        await promptContinue();
        continue;
      case 'disable':
        const { authMCPDisable } = await import('./auth.js');
        await authMCPDisable();
        await promptContinue();
        continue;
      case 'back':
        break;
    }
    break;
  }
}

async function promptReturnToMenu(): Promise<void> {
  const { returnMenu } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'returnMenu',
      message: 'Return to main menu?',
      default: true
    }
  ]);

}

async function promptContinue(): Promise<void> {
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }
  ]);
}
