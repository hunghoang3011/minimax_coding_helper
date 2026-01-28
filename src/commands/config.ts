import inquirer from 'inquirer';
import chalk from 'chalk';
import { authSet, authApply, authRevoke } from './auth.js';
import { loadConfig } from '../utils/config.js';
import { logger, printBox } from '../utils/logger.js';

export async function configMenu(): Promise<void> {
  console.clear();

  printBox([
    chalk.bold.cyan('MiniMax Configuration Manager'),
    '',
    'Manage your MiniMax configuration for Claude Code',
    'Press ^C at any time to quit'
  ]);

  logger.blank();

  // Check if there's an existing configuration
  const config = await loadConfig();

  if (!config || !config.api_key) {
    logger.warning('No MiniMax configuration found.');
    logger.blank();
    logger.info('Please run ' + chalk.cyan('mmhelper init') + ' to set up MiniMax.');
    return;
  }

  // Show current status
  logger.title('Current Configuration');
  logger.blank();

  const maskedKey = config.api_key
    ? `${config.api_key.slice(0, 8)}${'*'.repeat(Math.max(0, config.api_key.length - 8))}`
    : 'Not set';

  logger.info(`API Key:     ${chalk.cyan(maskedKey)}`);
  logger.info(`Region:      ${chalk.cyan(config.region)}`);
  logger.info(`Model:       ${chalk.cyan(config.model)}`);
  logger.info(`Base URL:    ${chalk.cyan(config.base_url)}`);
  logger.blank();

  // Show menu
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        {
          name: '🔄 Configuration Refresh - Update Claude Code\'s MiniMax configuration',
          value: 'refresh',
          short: 'Configuration Refresh'
        },
        {
          name: '🗑️  Unload Configuration - Remove MiniMax configuration from Claude Code',
          value: 'unload',
          short: 'Unload Configuration'
        },
        {
          name: '🔑 Change API Key - Update your MiniMax API key',
          value: 'change-key',
          short: 'Change API Key'
        },
        new inquirer.Separator(),
        {
          name: '❌ Exit',
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
      logger.info('Exiting...');
      break;
  }
}

async function handleRefresh(): Promise<void> {
  logger.title('Configuration Refresh');
  logger.blank();
  logger.info('This will reapply your MiniMax configuration to Claude Code.');
  logger.blank();

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Continue?',
      default: true
    }
  ]);

  if (!confirm) {
    logger.info('Operation cancelled.');
    return;
  }

  try {
    await authApply();
  } catch (error) {
    logger.error('Failed to refresh configuration.');
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}

async function handleUnload(): Promise<void> {
  logger.title('Unload Configuration');
  logger.blank();
  logger.warning('This will remove MiniMax configuration from Claude Code.');
  logger.info('Your saved API key will be kept for future use.');
  logger.blank();

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Continue?',
      default: false
    }
  ]);

  if (!confirm) {
    logger.info('Operation cancelled.');
    return;
  }

  try {
    const { removeKey } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'removeKey',
        message: 'Also remove your saved API key?',
        default: false
      }
    ]);

    if (removeKey) {
      await authRevoke();
    } else {
      // Only remove from Claude settings, keep saved config
      const { saveClaudeSettings } = await import('../utils/config.js');
      const claudeSettings = await (await import('../utils/config.js')).loadClaudeSettings();

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

        await (await import('../utils/config.js')).saveClaudeSettings(claudeSettings);
        logger.success('MiniMax configuration removed from Claude Code.');
        logger.info('Your API key is saved. Run ' + chalk.cyan('mmhelper config') + ' to reapply.');
      } else {
        logger.warning('No Claude Code configuration found.');
      }
    }
  } catch (error) {
    logger.error('Failed to unload configuration.');
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}

async function handleChangeKey(): Promise<void> {
  logger.title('Change API Key');
  logger.blank();
  logger.info('This will update your MiniMax API key.');

  try {
    await authSet();
  } catch (error) {
    logger.error('Failed to change API key.');
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}
