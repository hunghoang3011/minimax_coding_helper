import inquirer from 'inquirer';
import chalk from 'chalk';
import { authSet, authApply, authRevoke, authMCPEnable, authMCPDisable } from './auth.js';
import { loadConfig, isMCPEnabled } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export async function configMenu(): Promise<void> {
  console.clear();

  // Show header
  logger.blank();
  console.log(chalk.cyan.bold('╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║') + chalk.white.bold('        🤖 MiniMax Configuration Manager               ') + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝'));
  logger.blank();

  // Check existing config
  const config = await loadConfig();

  if (!config || !config.api_key) {
    console.log(chalk.yellow('⚠️  No configuration found.'));
    console.log(chalk.gray('   Please run ') + chalk.cyan.bold('mmhelper init') + chalk.gray(' to set up MiniMax.'));
    logger.blank();
    return;
  }

  // Show current status
  const maskedKey = config.api_key.slice(0, 4) + '****';
  const mcpEnabled = await isMCPEnabled();

  console.log(chalk.white('  Current Configuration:'));
  console.log(chalk.cyan('  Coding Plan: ') + chalk.white.bold(config.region === 'international' ? '🌍 MiniMax Coding Plan Global' : '🇨🇳 MiniMax Coding Plan China'));
  console.log(chalk.cyan('  API Key: ') + chalk.green('Set (' + maskedKey + ')'));
  console.log(chalk.cyan('  MCP Status: ') + (mcpEnabled ? chalk.green.bold('✅ Enabled') : chalk.gray('❌ Disabled')));
  logger.blank();
  logger.blank();

  // Show action menu
  await showActionMenu(config);
}

async function showActionMenu(config: any): Promise<void> {
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
      await handleRefresh(config);
      break;
    case 'unload':
      await handleUnload();
      break;
    case 'mcp':
      await handleMCPMenu(config);
      break;
    case 'marketplace':
      await handleMarketplace(config);
      break;
    case 'start-claude':
      await handleStartClaude(config);
      break;
    case 'exit':
      console.log(chalk.gray('👋 Goodbye!'));
      break;
  }
}

async function handleRefresh(config: any): Promise<void> {
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
    await showActionMenu(config);
    return;
  }

  try {
    await authApply();
    logger.blank();
    console.log(chalk.green('  ✅ Configuration refreshed successfully!'));
    await promptContinue();
    await showActionMenu(config);
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to refresh configuration.'));
    await promptContinue();
    await showActionMenu(config);
  }
}

async function handleUnload(): Promise<void> {
  logger.blank();
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('│') + chalk.white.bold('  🗑️  Unload Configuration                                  ') + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
  logger.blank();
  console.log(chalk.yellow('  ⚠️  This will remove MiniMax configuration from Claude Code.'));
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
    const config = await loadConfig();
    await showActionMenu(config);
    return;
  }

  try {
    const { removeKey } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'removeKey',
        message: chalk.bold.yellow('Also remove your saved API key?'),
        default: false
      }
    ]);

    if (removeKey) {
      await authRevoke();
    } else {
      // Only remove from Claude settings
      const { loadClaudeSettings, saveClaudeSettings } = await import('../utils/config.js');
      const claudeSettings = await loadClaudeSettings();

      if (claudeSettings?.env) {
        delete claudeSettings.env.ANTHROPIC_BASE_URL;
        delete claudeSettings.env.ANTHROPIC_AUTH_TOKEN;
        delete claudeSettings.env.API_TIMEOUT_MS;
        delete claudeSettings.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC;
        delete claudeSettings.env.ANTHROPIC_MODEL;
        delete claudeSettings.env.ANTHROPIC_SMALL_FAST_MODEL;
        delete claudeSettings.env.ANTHROPIC_DEFAULT_SONNET_MODEL;
        delete claudeSettings.env.ANTHROPIC_DEFAULT_OPUS_MODEL;
        delete claudeSettings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL;

        await saveClaudeSettings(claudeSettings);
        logger.blank();
        console.log(chalk.green('  ✅ MiniMax configuration removed from Claude Code.'));
      }
    }
    await promptContinue();
    await configMenu();
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to unload configuration.'));
    await promptContinue();
    const config = await loadConfig();
    await showActionMenu(config);
  }
}

async function handleMCPMenu(config: any): Promise<void> {
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
        await showActionMenu(config);
      } catch (error) {
        console.log(chalk.red('  ❌ Failed to enable MCP.'));
        await promptContinue();
        await showActionMenu(config);
      }
      break;
    case 'disable':
      try {
        await authMCPDisable();
        await promptContinue();
        await showActionMenu(config);
      } catch (error) {
        console.log(chalk.red('  ❌ Failed to disable MCP.'));
        await promptContinue();
        await showActionMenu(config);
      }
      break;
    case 'back':
      await showActionMenu(config);
      break;
  }
}

async function handleMarketplace(config: any): Promise<void> {
  logger.blank();
  console.log(chalk.yellow('  🏪 Plugin Marketplace'));
  logger.blank();
  console.log(chalk.gray('  Coming soon!'));
  console.log(chalk.white('  You\'ll be able to browse and install plugins to enhance'));
  console.log(chalk.white('  your MiniMax coding experience.'));
  logger.blank();
  await promptContinue();
  await showActionMenu(config);
}

async function handleStartClaude(config: any): Promise<void> {
  logger.blank();
  console.log(chalk.cyan('  💡 To start Claude Code:'));
  console.log(chalk.white('     1. Open a new terminal in your workspace'));
  console.log(chalk.cyan('     2. Run: ') + chalk.white.bold('claude'));
  logger.blank();
  await promptContinue();
  await showActionMenu(config);
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
