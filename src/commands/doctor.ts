import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import {
  loadConfig,
  loadClaudeSettings,
  getConfigFile,
  getClaudeSettingsPath,
  isVSCodeExtensionConfigured,
  getVSCodeSettingsPath
} from '../utils/config.js';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

interface DoctorCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
}

export async function runDoctor(): Promise<void> {
  logger.title('MiniMax Helper - System Check');
  logger.blank();

  const checks: DoctorCheck[] = [];

  // Check 1: Node.js version
  const nodeCheck = await checkNodeVersion();
  checks.push(nodeCheck);

  // Check 2: OS and platform
  checks.push(await checkPlatform());

  // Check 3: MiniMax config
  checks.push(await checkMiniMaxConfig());

  // Check 4: Claude Code installation
  checks.push(await checkClaudeInstalled());

  // Check 5: Claude Code configuration
  checks.push(await checkClaudeConfig());

  // Check 6: API key format
  checks.push(await checkApiKeyFormat());

  // Check 7: VS Code Extension configuration
  checks.push(await checkVSCodeExtension());

  // Check 8: MiniMax API connectivity
  checks.push(await checkApiConnectivity());

  // Print results
  printResults(checks);

  // Summary
  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const failCount = checks.filter(c => c.status === 'fail').length;

  logger.blank();
  logger.title('Summary');
  logger.info(`Passed:  ${chalk.green(passCount.toString())}`);
  logger.info(`Warnings: ${chalk.yellow(warnCount.toString())}`);
  logger.info(`Failed:  ${chalk.red(failCount.toString())}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

function printResults(checks: DoctorCheck[]): void {
  for (const check of checks) {
    const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
    const color = check.status === 'pass' ? chalk.green : check.status === 'warn' ? chalk.yellow : chalk.red;

    console.log(`${color(icon)} ${chalk.bold(check.name)}`);

    if (check.message) {
      console.log(`  ${check.message}`);
    }

    if (check.details) {
      console.log(chalk.gray(`  ${check.details}`));
    }

    console.log('');
  }
}

async function checkNodeVersion(): Promise<DoctorCheck> {
  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0], 10);

  if (majorVersion >= 18) {
    return {
      name: 'Node.js Version',
      status: 'pass',
      message: `Node.js ${version} installed (required: >= 18.0.0)`
    };
  }

  return {
    name: 'Node.js Version',
    status: 'fail',
    message: `Node.js ${version} is too old (required: >= 18.0.0)`,
    details: 'Please upgrade Node.js from https://nodejs.org/'
  };
}

async function checkPlatform(): Promise<DoctorCheck> {
  const platform = os.platform();
  const arch = os.arch();

  return {
    name: 'Platform',
    status: 'pass',
    message: `${platform} ${arch}`,
    details: `Node.js ${process.version}, ${os.release()}`
  };
}

async function checkMiniMaxConfig(): Promise<DoctorCheck> {
  const configExists = await fs.pathExists(getConfigFile());

  if (!configExists) {
    return {
      name: 'MiniMax Config',
      status: 'warn',
      message: 'Configuration not found',
      details: `Run ${chalk.cyan('mmhelper auth')} to set up your API key`
    };
  }

  const config = await loadConfig();

  if (!config || !config.api_key) {
    return {
      name: 'MiniMax Config',
      status: 'warn',
      message: 'Configuration exists but API key is missing',
      details: `Run ${chalk.cyan('mmhelper auth')} to set your API key`
    };
  }

  return {
    name: 'MiniMax Config',
    status: 'pass',
    message: 'Configuration found',
    details: `Region: ${config.region}, Model: ${config.model}`
  };
}

async function checkClaudeInstalled(): Promise<DoctorCheck> {
  try {
    await execAsync('claude --version');
    return {
      name: 'Claude Code Installation',
      status: 'pass',
      message: 'Claude Code CLI is installed'
    };
  } catch {
    return {
      name: 'Claude Code Installation',
      status: 'warn',
      message: 'Claude Code CLI not found in PATH',
      details: 'Install from https://claude.ai/download'
    };
  }
}

async function checkClaudeConfig(): Promise<DoctorCheck> {
  const settingsPath = getClaudeSettingsPath();
  const settingsExist = await fs.pathExists(settingsPath);

  if (!settingsExist) {
    return {
      name: 'Claude Code Configuration',
      status: 'warn',
      message: 'Claude settings.json not found',
      details: `Expected location: ${settingsPath}`
    };
  }

  const settings = await loadClaudeSettings();

  if (!settings?.env?.ANTHROPIC_AUTH_TOKEN) {
    return {
      name: 'Claude Code Configuration',
      status: 'warn',
      message: 'Claude settings exist but MiniMax not applied',
      details: `Run ${chalk.cyan('mmhelper auth apply')} to apply MiniMax configuration`
    };
  }

  const isMiniMax = settings.env.ANTHROPIC_BASE_URL?.includes('minimax');

  if (isMiniMax) {
    return {
      name: 'Claude Code Configuration',
      status: 'pass',
      message: 'Claude Code configured for MiniMax',
      details: `Model: ${settings.env.ANTHROPIC_MODEL || 'Not set'}`
    };
  }

  return {
    name: 'Claude Code Configuration',
    status: 'warn',
    message: 'Claude Code is configured for a different API',
    details: `Current base URL: ${settings.env.ANTHROPIC_BASE_URL || 'Not set'}`
  };
}

async function checkApiKeyFormat(): Promise<DoctorCheck> {
  const config = await loadConfig();

  if (!config || !config.api_key) {
    return {
      name: 'API Key Format',
      status: 'warn',
      message: 'No API key to validate'
    };
  }

  // MiniMax API keys typically start with specific prefixes
  const isValidLength = config.api_key.length >= 20;

  if (!isValidLength) {
    return {
      name: 'API Key Format',
      status: 'fail',
      message: 'API key appears to be too short',
      details: 'Please verify your API key from the MiniMax platform'
    };
  }

  return {
    name: 'API Key Format',
    status: 'pass',
    message: 'API key format looks valid'
  };
}

async function checkVSCodeExtension(): Promise<DoctorCheck> {
  const settingsPath = getVSCodeSettingsPath();
  const settingsExist = await fs.pathExists(settingsPath);

  if (!settingsExist) {
    return {
      name: 'VS Code Extension',
      status: 'warn',
      message: 'VS Code settings not found',
      details: 'VS Code extension may not be installed or configured'
    };
  }

  const isConfigured = await isVSCodeExtensionConfigured();

  if (isConfigured) {
    return {
      name: 'VS Code Extension',
      status: 'pass',
      message: 'VS Code extension configured for MiniMax'
    };
  }

  return {
    name: 'VS Code Extension',
    status: 'warn',
    message: 'VS Code extension not configured for MiniMax',
    details: `Run ${chalk.cyan('mmhelper auth apply')} to configure`
  };
}

async function checkApiConnectivity(): Promise<DoctorCheck> {
  const config = await loadConfig();

  if (!config || !config.api_key) {
    return {
      name: 'API Connectivity',
      status: 'warn',
      message: 'Cannot test - no API key configured'
    };
  }

  try {
    // Try to ping the MiniMax API
    const response = await fetch(`${config.base_url}/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      })
    }).catch(() => null);

    if (response) {
      if (response.ok || response.status === 400 || response.status === 401) {
        // 400/401 means the server is responding, just auth/quota issues
        return {
          name: 'API Connectivity',
          status: 'pass',
          message: 'MiniMax API is reachable'
        };
      }
      return {
        name: 'API Connectivity',
        status: 'warn',
        message: `API returned status ${response.status}`,
        details: 'Check your API key and quota'
      };
    }

    return {
      name: 'API Connectivity',
      status: 'fail',
      message: 'Could not reach MiniMax API',
      details: `URL: ${config.base_url}`
    };
  } catch {
    return {
      name: 'API Connectivity',
      status: 'fail',
      message: 'Network error while connecting to MiniMax API',
      details: 'Check your internet connection'
    };
  }
}
