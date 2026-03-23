import inquirer from 'inquirer';
import chalk from 'chalk';
import { authSet, authApply, authRevoke, authMCPEnable, authMCPDisable, authUnload } from './auth.js';
import { loadConfig, isMCPEnabled, isVSCodeExtensionConfigured } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export async function configMenu(): Promise<void> {
  logger.blank();
  console.log(chalk.cyan.bold('╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║') + chalk.white.bold('        🤖 MiniMax Configuration Manager               ') + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝'));
  logger.blank();

  const config = await loadConfig();

  if (!config || !config.api_key) {
    console.log(chalk.yellow('⚠️  No configuration found.'));
    console.log(chalk.gray('   Please run ') + chalk.cyan.bold('mmhelper init') + chalk.gray(' to set up MiniMax.'));
    logger.blank();
    return;
  }

  const maskedKey = config.api_key.slice(0, 4) + '****';
  const mcpEnabled = await isMCPEnabled();
  const vscodeEnabled = await isVSCodeExtensionConfigured();

  console.log(chalk.white('  Current Configuration:'));
  console.log(chalk.cyan('  Coding Plan: ') + chalk.white.bold(config.region === 'international' ? '🌍 MiniMax Coding Plan Global' : '🇨🇳 MiniMax Coding Plan China'));
  console.log(chalk.cyan('  API Key: ') + chalk.green('Set (' + maskedKey + ')'));
  console.log(chalk.cyan('  Claude Code: ') + chalk.green.bold('✅ Configured'));
  console.log(chalk.cyan('  VS Code Extension: ') + (vscodeEnabled ? chalk.green.bold('✅ Configured') : chalk.gray('❌ Not Configured')));
  console.log(chalk.cyan('  MCP Status: ') + (mcpEnabled ? chalk.green.bold('✅ Enabled') : chalk.gray('❌ Disabled')));
  logger.blank();
  logger.blank();

  await showActionMenu(config);
}

async function showActionMenu(config: any): Promise<void> {
  while (true) {
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
        await handleRefresh();
        continue;
      case 'unload':
        await handleUnload();
        continue;
      case 'mcp':
        await handleMCPMenu();
        continue;
      case 'marketplace':
        await handleMarketplace();
        continue;
      case 'start-claude':
        await handleStartClaude();
        continue;
      case 'exit':
        console.log(chalk.gray('👋 Goodbye!'));
        break;
    }
    break;
  }
}

async function handleRefresh(): Promise<void> {
  logger.blank();
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('│') + chalk.white.bold('  🔄 Configuration Refresh                                ') + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
  logger.blank();
  console.log(chalk.white('  This will reapply your MiniMax configuration to Claude Code.'));
  logger.blank();

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.bold.cyan('Continue?'),
      default: true
    }
  ]);

  if (!confirm) {
    return;
  }

  try {
    await authApply();
    logger.blank();
    console.log(chalk.green('  ✅ Configuration refreshed successfully!'));
    await promptContinue();
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to refresh configuration.'));
    await promptContinue();
  }
}

async function handleUnload(): Promise<void> {
  logger.blank();
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('│') + chalk.white.bold('  🗑️  Unload Configuration                                  ') + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
  logger.blank();
  console.log(chalk.yellow('  ⚠️  This will remove MiniMax configuration from:'));
  console.log(chalk.white('    • Claude Code settings'));
  console.log(chalk.white('    • VS Code extension'));
  console.log(chalk.white('    • MCP configuration'));
  logger.blank();
  console.log(chalk.white('  Your saved API key will be kept for future use.'));
  logger.blank();

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.bold.yellow('Continue?'),
      default: false
    }
  ]);

  if (!confirm) {
    return;
  }

  try {
    await authUnload();
    await promptContinue();
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to unload configuration.'));
    await promptContinue();
  }
}

async function handleMCPMenu(): Promise<void> {
  while (true) {
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
        try {
          await authMCPEnable();
          await promptContinue();
        } catch (error) {
          console.log(chalk.red('  ❌ Failed to enable MCP.'));
          await promptContinue();
        }
        continue;
      case 'disable':
        try {
          await authMCPDisable();
          await promptContinue();
        } catch (error) {
          console.log(chalk.red('  ❌ Failed to disable MCP.'));
          await promptContinue();
        }
        continue;
      case 'back':
        break;
    }
    break;
  }
}

async function handleMarketplace(): Promise<void> {
  logger.blank();
  console.log(chalk.yellow('  🏪 Plugin Marketplace'));
  logger.blank();
  console.log(chalk.gray('  Coming soon!'));
  console.log(chalk.white('  You\'ll be able to browse and install plugins to enhance'));
  console.log(chalk.white('  your MiniMax coding experience.'));
  logger.blank();
  await promptContinue();
}

async function handleStartClaude(): Promise<void> {
  logger.blank();
  console.log(chalk.cyan('  💡 To start Claude Code:'));
  console.log(chalk.white('     1. Open a new terminal in your workspace'));
  console.log(chalk.cyan('     2. Run: ') + chalk.white.bold('claude'));
  logger.blank();
  await promptContinue();
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
