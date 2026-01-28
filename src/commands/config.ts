import inquirer from 'inquirer';
import chalk from 'chalk';
import { authSet, authApply, authRevoke } from './auth.js';
import { loadConfig } from '../utils/config.js';
import { logger, printBox } from '../utils/logger.js';

export async function configMenu(): Promise<void> {
  console.clear();

  // Beautiful header
  logger.blank();
  console.log(chalk.cyan.bold('╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║') + chalk.white.bold('        🤖 MiniMax Configuration Manager               ') + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold('║') + chalk.white('        Manage your MiniMax integration                  ') + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝'));
  logger.blank();

  // Check if there's an existing configuration
  const config = await loadConfig();

  if (!config || !config.api_key) {
    console.log(chalk.yellow('⚠️  No MiniMax configuration found.'));
    logger.blank();
    console.log(chalk.gray('   Please run ') + chalk.cyan.bold('mmhelper init') + chalk.gray(' to set up MiniMax.'));
    logger.blank();
    return;
  }

  // Show current status with beautiful card
  logger.blank();
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('│') + chalk.white.bold('  📋 Current Configuration                                ') + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('├─────────────────────────────────────────────────────────┤'));
  console.log(chalk.bold.cyan('│') + chalk.white('  API Key:     ') + chalk.green(config.api_key.slice(0, 8) + '****') + '                              '.repeat(0) + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('│') + chalk.white('  Region:      ') + chalk.cyan(config.region === 'international' ? '🌍 International' : '🇨🇳 China') + '                                '.repeat(0) + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('│') + chalk.white('  Model:       ') + chalk.yellow.bold('MiniMax-M2.1') + '                                       '.repeat(0) + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('│') + chalk.white('  Base URL:    ') + chalk.gray(config.base_url) + '  '.repeat(0) + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
  logger.blank();
  logger.blank();

  // Show menu
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: chalk.bold.cyan('What would you like to do?'),
      choices: [
        {
          name: chalk.green('🔄') + ' Configuration Refresh - ' + chalk.white('Update Claude Code\'s MiniMax configuration'),
          value: 'refresh',
          short: 'Configuration Refresh'
        },
        {
          name: chalk.red('🗑️ ') + ' Unload Configuration - ' + chalk.white('Remove MiniMax from Claude Code'),
          value: 'unload',
          short: 'Unload Configuration'
        },
        {
          name: chalk.yellow('🔑') + ' Change API Key - ' + chalk.white('Update your MiniMax API key'),
          value: 'change-key',
          short: 'Change API Key'
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
      break;
    case 'unload':
      await handleUnload();
      break;
    case 'change-key':
      await handleChangeKey();
      break;
    case 'exit':
      console.log(chalk.gray('👋 Goodbye!'));
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
  console.log(chalk.gray('  ✅ Keeps your current API key'));
  console.log(chalk.gray('  ✅ Updates Claude Code settings'));
  console.log(chalk.gray('  ✅ Restarts MiniMax integration'));
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
    console.log(chalk.yellow('  ⚠️  Operation cancelled.'));
    return;
  }

  try {
    await authApply();
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to refresh configuration.'));
    if (error instanceof Error) {
      console.log(chalk.red('     ' + error.message));
    }
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
    console.log(chalk.yellow('  ⚠️  Operation cancelled.'));
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
      // Only remove from Claude settings, keep saved config
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
        console.log(chalk.gray('     Your API key is saved. Run ') + chalk.cyan('mmhelper config') + chalk.gray(' to reapply.'));
      } else {
        console.log(chalk.yellow('  ⚠️  No Claude Code configuration found.'));
      }
    }
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to unload configuration.'));
    if (error instanceof Error) {
      console.log(chalk.red('     ' + error.message));
    }
  }
}

async function handleChangeKey(): Promise<void> {
  logger.blank();
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('│') + chalk.white.bold('  🔑 Change API Key                                       ') + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
  logger.blank();
  console.log(chalk.white('  This will update your MiniMax API key.'));
  logger.blank();

  try {
    await authSet();
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to change API key.'));
    if (error instanceof Error) {
      console.log(chalk.red('     ' + error.message));
    }
  }
}
