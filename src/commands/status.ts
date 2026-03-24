import chalk from 'chalk';
import {
  loadConfig,
  loadClaudeSettings,
  loadClaudeJson
} from '../utils/config.js';
import { logger } from '../utils/logger.js';

interface StatusOptions {
  json?: boolean;
}

interface StatusResult {
  configured: boolean;
  applied: boolean;
  mcp: boolean;
  model: string | null;
  region: string | null;
}

export async function runStatus(options: StatusOptions = {}): Promise<void> {
  let configured = false;
  let applied = false;
  let mcp = false;
  let model: string | null = null;
  let region: string | null = null;

  try {
    const config = await loadConfig();
    if (config?.api_key) {
      configured = true;
      model = config.model || null;
      region = config.region || null;
    }
  } catch {
  }

  try {
    const claudeSettings = await loadClaudeSettings();
    if (claudeSettings?.env?.ANTHROPIC_BASE_URL?.includes('minimax')) {
      applied = true;
    }
  } catch {
  }

  try {
    const claudeJson = await loadClaudeJson();
    if (claudeJson?.mcpServers?.MiniMax) {
      mcp = true;
    }
  } catch {
  }

  const statusObj: StatusResult = { configured, applied, mcp, model, region };

  if (options.json) {
    console.log(JSON.stringify(statusObj));
    return;
  }

  const regionLabel = region === 'china' ? 'China' : 'International';

  logger.blank();
  if (configured && applied) {
    console.log(chalk.green.bold('  MINIMAX ACTIVE'));
  } else if (configured) {
    console.log(chalk.yellow.bold('  MINIMAX INACTIVE') + chalk.gray(' (configured but not applied)'));
  } else {
    console.log(chalk.gray.bold('  MINIMAX NOT CONFIGURED'));
  }
  logger.blank();

  console.log(chalk.cyan('  API Key:     ') + (configured ? chalk.green('Set') : chalk.red('Not set')));
  console.log(chalk.cyan('  Claude Code: ') + (applied ? chalk.green('MiniMax applied') : chalk.gray('Default (Anthropic)')));
  console.log(chalk.cyan('  Model:       ') + chalk.white(model || 'N/A'));
  console.log(chalk.cyan('  Region:      ') + chalk.white(regionLabel));
  console.log(chalk.cyan('  MCP:         ') + (mcp ? chalk.green('Enabled') : chalk.gray('Disabled')));
  logger.blank();

  // Actionable hint
  if (!configured) {
    console.log(chalk.gray('  Get started: mmhelper init'));
  } else if (!applied) {
    console.log(chalk.gray('  Activate: mmhelper on'));
  } else {
    console.log(chalk.gray('  Deactivate: mmhelper off'));
  }
}
