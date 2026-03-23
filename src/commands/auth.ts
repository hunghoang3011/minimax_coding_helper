import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  loadConfig,
  saveConfig,
  removeConfig,
  loadClaudeSettings,
  saveClaudeSettings,
  getClaudeEnvConfig,
  backupClaudeSettings,
  getConfigFile,
  getClaudeSettingsPath,
  enableMCP,
  disableMCP,
  isMCPEnabled,
  tryClaudeMCPRemove,
  applyVSCodeExtensionConfig,
  removeVSCodeExtensionConfig,
  isVSCodeExtensionConfigured,
  type MiniMaxConfig
} from '../utils/config.js';
import { logger, createSpinner } from '../utils/logger.js';

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function promptForApiKey(): Promise<string> {
  let apiKey = '';
  let showPassword = false;

  while (!apiKey || apiKey.trim().length === 0) {
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your MiniMax API Key:',
        mask: showPassword ? undefined : '*',
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'API Key cannot be empty';
          }
          if (input.trim().length < 10) {
            return 'API Key seems too short. Please check and try again.';
          }
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'showPassword',
        message: 'Show API key?',
        default: false,
        when: () => !showPassword
      }
    ]);

    if (answers.showPassword && !showPassword) {
      showPassword = true;
      continue;
    }

    apiKey = (answers.apiKey as string).trim();
  }

  return apiKey;
}
export async function authSet(apiKey?: string, region?: 'international' | 'china'): Promise<void> {
  const config = await loadConfig() || {} as MiniMaxConfig;

  if (!apiKey) {
    apiKey = await promptForApiKey();
  } else {
    apiKey = apiKey.trim();
  }

  if (!region) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'region',
        message: 'Select your region:',
        choices: [
          { name: 'International (api.minimax.io)', value: 'international' },
          { name: 'China (api.minimaxi.com)', value: 'china' }
        ],
        default: config.region || 'international'
      }
    ]);
    region = answers.region as 'international' | 'china';
  }

  config.api_key = apiKey;
  config.region = region;
  config.base_url = region === 'international'
    ? 'https://api.minimax.io/anthropic'
    : 'https://api.minimaxi.com/anthropic';
  config.model = 'MiniMax-M2.7';
  config.api_timeout_ms = '3000000';

  await saveConfig(config);
  logger.success('API Key saved successfully!');
  logger.info(`Region: ${chalk.cyan(region)}`);
  logger.info(`Base URL: ${chalk.cyan(config.base_url)}`);

  const { applyNow } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'applyNow',
      message: 'Apply MiniMax configuration to Claude Code now?',
      default: true
    }
  ]);

  if (applyNow) {
    await authApply();
  } else {
    logger.info('Run `mmhelper auth apply` to apply the configuration later.');
  }
}

export async function authShow(): Promise<void> {
  const config = await loadConfig();

  if (!config) {
    logger.warning('No API key found. Run `mmhelper auth` to set one.');
    return;
  }

  logger.title('MiniMax Configuration');
  logger.blank();

  // Mask API key
  const maskedKey = config.api_key
    ? `${config.api_key.slice(0, 8)}${'*'.repeat(Math.max(0, config.api_key.length - 8))}`
    : 'Not set';

  logger.info(`API Key:        ${chalk.cyan(maskedKey)}`);
  logger.info(`Region:         ${chalk.cyan(config.region)}`);
  logger.info(`Base URL:       ${chalk.cyan(config.base_url)}`);
  logger.info(`Model:          ${chalk.cyan(config.model)}`);
  logger.info(`API Timeout:    ${chalk.cyan(config.api_timeout_ms)}ms`);

  // Check Claude Code configuration
  const claudeSettings = await loadClaudeSettings();
  if (claudeSettings?.env?.ANTHROPIC_AUTH_TOKEN) {
    const claudeKey = claudeSettings.env.ANTHROPIC_AUTH_TOKEN;
    const claudeMasked = `${claudeKey.slice(0, 8)}${'*'.repeat(Math.max(0, claudeKey.length - 8))}`;

    logger.blank();
    logger.title('Claude Code Status');
    logger.info(`Configured:     ${chalk.green('Yes')}`);
    logger.info(`API Key:        ${chalk.cyan(claudeMasked)}`);
    logger.info(`Base URL:       ${chalk.cyan(claudeSettings.env.ANTHROPIC_BASE_URL || 'Not set')}`);
    logger.info(`Model:          ${chalk.cyan(claudeSettings.env.ANTHROPIC_MODEL || 'Not set')}`);
  } else {
    logger.blank();
    logger.title('Claude Code Status');
    logger.warning('Not configured. Run `mmhelper auth apply` to apply.');
  }
}

export async function authRevoke(keepSettings: boolean = false): Promise<void> {
  const config = await loadConfig();

  if (!config) {
    logger.warning('No API key found. Nothing to revoke.');
    return;
  }

  if (!keepSettings) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to remove the saved API key?',
        default: false
      }
    ]);

    if (!confirm) {
      logger.info('Operation cancelled.');
      return;
    }
  }

  await removeConfig();
  logger.success('API key removed successfully.');

  if (keepSettings) {
    return;
  }

  const { restoreClaude } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'restoreClaude',
      message: 'Restore original Claude Code settings?',
      default: true
    }
  ]);

  if (restoreClaude) {
    // Disable MCP before cleaning up settings
    try {
      await disableMCP();
    } catch {
      // MCP may not be enabled, continue cleanup
    }

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
      delete claudeSettings.model;

      // Clean up empty env object
      if (claudeSettings.env && Object.keys(claudeSettings.env).length === 0) {
        delete claudeSettings.env;
      }

      await saveClaudeSettings(claudeSettings);
      logger.success('Claude Code settings restored.');
    }

    const vscodeSpinner = createSpinner('Removing VS Code extension configuration...');
    vscodeSpinner.start();
    try {
      await removeVSCodeExtensionConfig();
      vscodeSpinner.succeed('VS Code extension configuration removed!');
    } catch {
      vscodeSpinner.warn('VS Code extension not configured');
    }
  }
}

export async function authApply(): Promise<void> {
  const config = await loadConfig();

  if (!config || !config.api_key) {
    logger.error('No API key found. Run `mmhelper auth` to set one.');
    return;
  }

  const spinner = createSpinner('Applying MiniMax configuration to Claude Code...');
  spinner.start();

  try {
    await backupClaudeSettings();
    const envConfig = getClaudeEnvConfig(config);

    await saveClaudeSettings({ 
      env: envConfig,
      model: config.model 
    });

    const vscodeSpinner = createSpinner('Configuring VS Code extension...');
    vscodeSpinner.start();
    try {
      await applyVSCodeExtensionConfig(config);
      vscodeSpinner.succeed('VS Code extension configured!');
    } catch {
      vscodeSpinner.warn('VS Code extension not configured (may not be installed)');
    }

    spinner.succeed('MiniMax configuration applied to Claude Code!');
    logger.blank();
    logger.info('Claude Code configuration:');
    logger.info(`  Base URL:  ${chalk.cyan(envConfig.ANTHROPIC_BASE_URL)}`);
    logger.info(`  Model:     ${chalk.cyan(envConfig.ANTHROPIC_MODEL)}`);
    logger.blank();
    logger.success('You can now use Claude Code with MiniMax-M2.7!');
    logger.info('Restart Claude Code if it\'s currently running.');
  } catch (error) {
    spinner.fail('Failed to apply configuration.');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw error;
  }
}

export async function authPath(): Promise<void> {
  logger.title('Configuration Paths');
  logger.blank();
  logger.info(`MiniMax Config:  ${chalk.cyan(getConfigFile())}`);
  logger.info(`Claude Settings: ${chalk.cyan(getClaudeSettingsPath())}`);

  const configExists = await fs.pathExists(getConfigFile());
  const claudeExists = await fs.pathExists(getClaudeSettingsPath());

  logger.blank();
  logger.info(`MiniMax Config:  ${configExists ? chalk.green('Exists') : chalk.red('Not Found')}`);
  logger.info(`Claude Settings: ${claudeExists ? chalk.green('Exists') : chalk.red('Not Found')}`);
}

async function isUvxInstalled(): Promise<boolean> {
  try {
    await execAsync('which uvx');
    return true;
  } catch {
    return false;
  }
}

async function installUvx(): Promise<void> {
  const spinner = createSpinner('Installing uvx...');
  spinner.start();

  try {
    await execAsync('curl -LsSf https://astral.sh/uv/install.sh | sh');
    spinner.succeed('uvx installed successfully!');
  } catch (error) {
    spinner.fail('Failed to install uvx.');
    throw error;
  }
}

export async function authMCPEnable(): Promise<void> {
  const config = await loadConfig();

  if (!config || !config.api_key) {
    logger.error('No API key found. Run `mmhelper auth set` to configure one.');
    return;
  }

  // Step 1: Check uvx installation
  let uvxInstalled = await isUvxInstalled();
  if (!uvxInstalled) {
    logger.info('uvx not found. Installing...');
    await installUvx();
    uvxInstalled = await isUvxInstalled();
    if (!uvxInstalled) {
      logger.error('Failed to install uvx. Please install manually.');
      return;
    }
  }

  // Step 2: Determine API host based on region
  const apiHost = config.region === 'china' ? 'https://api.minimaxi.com' : 'https://api.minimax.io';

  // Step 3: Add MCP using Claude CLI
  const spinner = createSpinner('Adding MiniMax MCP to Claude Code...');
  spinner.start();

  try {
    const command = `claude mcp add -s user MiniMax --env MINIMAX_API_KEY=${config.api_key} --env MINIMAX_API_HOST=${apiHost} -- uvx minimax-coding-plan-mcp -y`;
    await execAsync(command);

    spinner.succeed('MiniMax MCP enabled successfully!');
    logger.blank();
    logger.success('MCP tools (web_search, understand_image) are now available.');
    logger.info('Restart Claude Code to use MCP features.');
  } catch (error) {
    spinner.fail('Failed to add MCP via Claude CLI.');

    // Fallback: try the old method
    logger.info('Trying legacy method...');
    try {
      await enableMCP(config);
      spinner.succeed('MiniMax MCP enabled via legacy method!');
    } catch (fallbackError) {
      spinner.fail('Failed to enable MCP.');
      throw error;
    }
  }
}

export async function authMCPDisable(): Promise<void> {
  const mcpEnabled = await isMCPEnabled();

  if (!mcpEnabled) {
    logger.warning('MCP is not currently enabled.');
    return;
  }

  const spinner = createSpinner('Disabling MiniMax MCP...');
  spinner.start();

  try {
    await disableMCP();

    spinner.succeed('MiniMax MCP disabled successfully!');
    logger.info('Restart Claude Code to apply changes.');
  } catch (error) {
    spinner.fail('Failed to disable MCP.');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw error;
  }
}

export async function authUnload(removeAll: boolean = false): Promise<void> {
  const config = await loadConfig();

  if (!config) {
    logger.warning('No configuration found. Nothing to unload.');
    return;
  }

  const spinner = createSpinner('Unloading MiniMax configuration...');
  spinner.start();

  try {
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
      delete claudeSettings.model;

      if (claudeSettings.env && Object.keys(claudeSettings.env).length === 0) {
        delete claudeSettings.env;
      }

      await saveClaudeSettings(claudeSettings);
    }

    const vscodeSpinner = createSpinner('Removing VS Code extension configuration...');
    vscodeSpinner.start();
    try {
      await removeVSCodeExtensionConfig();
      vscodeSpinner.succeed('VS Code extension unloaded!');
    } catch {
      vscodeSpinner.warn('VS Code extension not configured');
    }

    const mcpSpinner = createSpinner('Disabling MCP...');
    mcpSpinner.start();
    try {
      const cliRemoved = await tryClaudeMCPRemove();
      if (!cliRemoved) {
        await disableMCP();
      }
      mcpSpinner.succeed('MCP disabled!');
    } catch {
      mcpSpinner.warn('MCP was not enabled');
    }

    spinner.succeed('MiniMax configuration unloaded from Claude Code!');
    logger.blank();
    logger.info('Your API key has been preserved for future use.');
    logger.info('Run `mmhelper auth apply` to reapply configuration.');
  } catch (error) {
    spinner.fail('Failed to unload configuration.');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw error;
  }
}
