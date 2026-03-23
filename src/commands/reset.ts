import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  loadClaudeSettings,
  writeClaudeSettingsDirect,
  loadClaudeJson,
  loadVSCodeSettings,
  writeVSCodeSettingsDirect,
  disableMCP,
  getConfigDir,
  getClaudeSettingsPath,
  getClaudeJsonPath,
  getVSCodeSettingsPath
} from '../utils/config.js';
import { logger, createSpinner } from '../utils/logger.js';

const execAsync = promisify(exec);

const MINIMAX_ENV_KEYS = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'API_TIMEOUT_MS',
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL'
];

export interface ResetOptions {
  dryRun?: boolean;
  full?: boolean;
  yes?: boolean;
}

export interface ResetAction {
  target: string;
  action: string;
  description: string;
  details: string;
}

interface ResetResult {
  action: ResetAction;
  success: boolean;
  error?: string;
}

export async function buildResetPlan(options: ResetOptions): Promise<ResetAction[]> {
  const actions: ResetAction[] = [];

  try {
    const claudeSettings = await loadClaudeSettings();
    if (claudeSettings?.env) {
      const minimaxKeys = MINIMAX_ENV_KEYS.filter(key => key in claudeSettings.env!);
      if (minimaxKeys.length > 0) {
        actions.push({
          target: getClaudeSettingsPath(),
          action: 'remove-env-vars',
          description: 'Remove MiniMax environment variables from Claude settings',
          details: `Keys: ${minimaxKeys.join(', ')}`
        });
      }
    }
    if (claudeSettings?.model) {
      actions.push({
        target: getClaudeSettingsPath(),
        action: 'remove-model',
        description: 'Remove model override from Claude settings',
        details: `Current model: ${claudeSettings.model}`
      });
    }
  } catch {
    actions.push({
      target: getClaudeSettingsPath(),
      action: 'manual-cleanup',
      description: 'Claude settings file could not be parsed',
      details: 'Manual cleanup needed — file may contain invalid JSON'
    });
  }

  try {
    const claudeJson = await loadClaudeJson();
    if (claudeJson?.mcpServers?.MiniMax) {
      actions.push({
        target: getClaudeJsonPath(),
        action: 'remove-mcp',
        description: 'Remove MiniMax MCP server configuration',
        details: 'Removes the MiniMax entry from mcpServers'
      });
    }
  } catch {
    actions.push({
      target: getClaudeJsonPath(),
      action: 'manual-cleanup',
      description: 'Claude JSON file could not be parsed',
      details: 'Manual cleanup needed — file may contain invalid JSON'
    });
  }

  try {
    const vscodeSettings = await loadVSCodeSettings();
    if (vscodeSettings) {
      const hasModel = 'claudeCode.selectedModel' in vscodeSettings;
      const hasEnvVars = 'claudeCode.environmentVariables' in vscodeSettings;
      if (hasModel || hasEnvVars) {
        const parts: string[] = [];
        if (hasModel) parts.push('claudeCode.selectedModel');
        if (hasEnvVars) parts.push('claudeCode.environmentVariables');
        actions.push({
          target: getVSCodeSettingsPath(),
          action: 'remove-vscode-config',
          description: 'Remove MiniMax config from VS Code settings',
          details: `Keys: ${parts.join(', ')}`
        });
      }
    }
  } catch {
    actions.push({
      target: getVSCodeSettingsPath(),
      action: 'manual-cleanup',
      description: 'VS Code settings file could not be parsed',
      details: 'Manual cleanup needed — file may contain invalid JSON'
    });
  }

  if (options.full) {
    const configDir = getConfigDir();
    try {
      const exists = await fs.pathExists(configDir);
      if (exists) {
        actions.push({
          target: configDir,
          action: 'delete-config-dir',
          description: 'Delete MiniMax helper config directory',
          details: `Removes ${configDir} (API key, backups, config.yaml)`
        });
      }
    } catch {
      actions.push({
        target: configDir,
        action: 'manual-cleanup',
        description: 'Could not check config directory',
        details: `Manual cleanup needed for ${configDir}`
      });
    }
  }

  return actions;
}

export function printResetPlan(plan: ResetAction[]): void {
  logger.title('Reset Plan');
  logger.blank();

  for (const action of plan) {
    if (action.action === 'manual-cleanup') {
      console.log(`  ${chalk.yellow('⚠')}  ${chalk.bold(action.description)}`);
    } else {
      console.log(`  ${chalk.red('×')}  ${chalk.bold(action.description)}`);
    }
    console.log(chalk.gray(`     ${action.details}`));
    console.log(chalk.gray(`     Target: ${action.target}`));
    console.log('');
  }
}

async function executeResetPlan(plan: ResetAction[]): Promise<ResetResult[]> {
  const results: ResetResult[] = [];

  for (const action of plan) {
    if (action.action === 'manual-cleanup') {
      results.push({ action, success: false, error: 'Requires manual intervention' });
      continue;
    }

    const spinner = createSpinner(action.description);
    spinner.start();

    try {
      switch (action.action) {
        case 'remove-env-vars': {
          const settings = await loadClaudeSettings();
          if (settings?.env) {
            for (const key of MINIMAX_ENV_KEYS) {
              delete settings.env[key];
            }
            if (Object.keys(settings.env).length === 0) {
              delete settings.env;
            }
            await writeClaudeSettingsDirect(settings);
          }
          spinner.succeed(action.description);
          results.push({ action, success: true });
          break;
        }

        case 'remove-model': {
          const settings = await loadClaudeSettings();
          if (settings) {
            delete settings.model;
            await writeClaudeSettingsDirect(settings);
          }
          spinner.succeed(action.description);
          results.push({ action, success: true });
          break;
        }

        case 'remove-mcp': {
          try {
            await execAsync('claude mcp remove MiniMax');
          } catch {
            await disableMCP();
          }
          spinner.succeed(action.description);
          results.push({ action, success: true });
          break;
        }

        case 'remove-vscode-config': {
          const settings = await loadVSCodeSettings();
          if (settings) {
            delete settings['claudeCode.selectedModel'];
            delete settings['claudeCode.environmentVariables'];
            await writeVSCodeSettingsDirect(settings);
          }
          spinner.succeed(action.description);
          results.push({ action, success: true });
          break;
        }

        case 'delete-config-dir': {
          await fs.remove(getConfigDir());
          spinner.succeed(action.description);
          results.push({ action, success: true });
          break;
        }

        default: {
          spinner.warn(`Unknown action: ${action.action}`);
          results.push({ action, success: false, error: `Unknown action: ${action.action}` });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      spinner.fail(`${action.description} — ${errorMsg}`);
      results.push({ action, success: false, error: errorMsg });
    }
  }

  return results;
}

export async function runReset(options: ResetOptions = {}): Promise<void> {
  logger.title('MiniMax Helper — Reset');
  logger.blank();

  const planSpinner = createSpinner('Scanning for MiniMax artifacts...');
  planSpinner.start();

  const plan = await buildResetPlan(options);

  planSpinner.stop();

  if (plan.length === 0) {
    logger.success('Nothing to reset. MiniMax is not configured.');
    return;
  }

  printResetPlan(plan);

  if (options.dryRun) {
    logger.info(chalk.gray('Dry run — no changes made.'));
    return;
  }

  if (!options.yes) {
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed with reset?',
        default: false
      }
    ]);

    if (!proceed) {
      logger.info('Reset cancelled.');
      return;
    }
  }

  logger.blank();

  const results = await executeResetPlan(plan);

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  logger.blank();

  if (failed > 0) {
    logger.warning(`Reset completed with issues: ${succeeded} succeeded, ${failed} failed.`);
    logger.blank();

    for (const result of results.filter(r => !r.success)) {
      logger.error(`  ${result.action.description}: ${result.error}`);
    }

    logger.blank();
    process.exitCode = 1;
  } else {
    logger.success('All MiniMax artifacts removed. Claude Code is restored to vanilla.');
    logger.info('Restart Claude Code to apply changes.');
  }
}
