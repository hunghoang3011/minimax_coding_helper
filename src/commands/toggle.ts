import chalk from 'chalk';
import {
  loadConfig,
  loadClaudeSettings,
  loadClaudeJson,
  saveClaudeSettings,
  writeClaudeSettingsDirect,
  getClaudeEnvConfig,
  backupClaudeSettings,
  applyVSCodeExtensionConfig,
  removeVSCodeExtensionConfig,
  enableMCP,
  disableMCP,
  tryClaudeMCPRemove,
  isMiniMaxApplied,
  MINIMAX_ENV_KEYS
} from '../utils/config.js';
import { logger } from '../utils/logger.js';

export async function quickOn(): Promise<void> {
  const config = await loadConfig();
  if (!config?.api_key) {
    logger.error('No API key configured. Run: mmhelper init');
    process.exit(1);
  }

  if (await isMiniMaxApplied()) {
    logger.success('MiniMax is already active.');
    return;
  }

  // Backup and apply Claude Code settings
  await backupClaudeSettings();
  const envConfig = getClaudeEnvConfig(config);
  await saveClaudeSettings({ env: envConfig, model: config.model });

  // Apply VS Code extension config
  try {
    await applyVSCodeExtensionConfig(config);
  } catch {
    // VS Code config is optional
  }

  // Enable MCP if not already enabled
  try {
    const claudeJson = await loadClaudeJson();
    if (!claudeJson?.mcpServers?.MiniMax) {
      await enableMCP(config);
    }
  } catch {
    // MCP is optional
  }

  const regionLabel = config.region === 'china' ? 'China' : 'International';
  logger.success(`MiniMax activated (${config.model}, ${regionLabel}). Restart Claude Code to apply.`);
}

export async function quickOff(): Promise<void> {
  if (!(await isMiniMaxApplied())) {
    console.log(chalk.gray('MiniMax is not currently active. Claude Code is using default settings.'));
    return;
  }

  // Remove MiniMax env vars from Claude Code settings
  const claudeSettings = await loadClaudeSettings();
  if (claudeSettings?.env) {
    for (const key of MINIMAX_ENV_KEYS) {
      delete claudeSettings.env[key];
    }
    delete claudeSettings.model;

    if (claudeSettings.env && Object.keys(claudeSettings.env).length === 0) {
      delete claudeSettings.env;
    }

    await writeClaudeSettingsDirect(claudeSettings);
  }

  // Remove VS Code extension config
  try {
    await removeVSCodeExtensionConfig();
  } catch {
    // VS Code config is optional
  }

  // Disable MCP
  try {
    const cliRemoved = await tryClaudeMCPRemove();
    if (!cliRemoved) {
      await disableMCP();
    }
  } catch {
    // MCP is optional
  }

  logger.success('Claude Code restored to default. Restart Claude Code to apply.');
  console.log(chalk.gray('  Re-activate anytime: mmhelper on'));
}
