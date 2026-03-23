import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface MiniMaxConfig {
  api_key: string;
  region: 'international' | 'china';
  base_url: string;
  model: string;
  api_timeout_ms: string;
  claude_code_path: string;
  // VS Code Extension support
  vscode_extension_enabled?: boolean;
  vscode_settings_path?: string;
}

// Storage key prefix to avoid conflicts
export const STORAGE_KEY_PREFIX = 'MINIMAX_';

const CONFIG_DIR = path.join(os.homedir(), '.minimax-helper');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.yaml');

export const DEFAULT_BASE_URL_INTERNATIONAL = 'https://api.minimax.io/anthropic';
export const DEFAULT_BASE_URL_CHINA = 'https://api.minimaxi.com/anthropic';
export const DEFAULT_MODEL = 'MiniMax-M2.7';
export const DEFAULT_API_TIMEOUT = '3000000';
export const DEFAULT_CLAUDE_CONFIG_PATH = path.join(os.homedir(), '.claude');
export const DEFAULT_VSCODE_SETTINGS_PATH = path.join(os.homedir(), '.vscode');

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigFile(): string {
  return CONFIG_FILE;
}

export function getClaudeConfigPath(): string {
  return DEFAULT_CLAUDE_CONFIG_PATH;
}

export function getClaudeSettingsPath(): string {
  return path.join(DEFAULT_CLAUDE_CONFIG_PATH, 'settings.json');
}

export async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(CONFIG_DIR);
}

export async function loadConfig(): Promise<MiniMaxConfig | null> {
  try {
    const configExists = await fs.pathExists(CONFIG_FILE);
    if (!configExists) {
      return null;
    }

    const configContent = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = yaml.load(configContent) as MiniMaxConfig;

    // Set defaults if missing
    if (!config.model) {
      config.model = DEFAULT_MODEL;
    }
    if (!config.api_timeout_ms) {
      config.api_timeout_ms = DEFAULT_API_TIMEOUT;
    }
    if (!config.claude_code_path) {
      config.claude_code_path = DEFAULT_CLAUDE_CONFIG_PATH;
    }

    return config;
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
}

export async function saveConfig(config: MiniMaxConfig): Promise<void> {
  await ensureConfigDir();
  const configContent = yaml.dump(config, {
    indent: 2,
    lineWidth: -1
  });
  await fs.writeFile(CONFIG_FILE, configContent, 'utf-8');
}

export async function removeConfig(): Promise<void> {
  const configExists = await fs.pathExists(CONFIG_FILE);
  if (configExists) {
    await fs.remove(CONFIG_FILE);
  }
}

export interface ClaudeSettings {
  env?: Record<string, string>;
  model?: string;
}

export async function loadClaudeSettings(): Promise<ClaudeSettings | null> {
  try {
    const settingsPath = getClaudeSettingsPath();
    const settingsExists = await fs.pathExists(settingsPath);
    if (!settingsExists) {
      return {};
    }

    const settingsContent = await fs.readFile(settingsPath, 'utf-8');
    return JSON.parse(settingsContent) as ClaudeSettings;
  } catch (error) {
    console.error('Error loading Claude settings:', error);
    return null;
  }
}

export async function saveClaudeSettings(settings: ClaudeSettings): Promise<void> {
  try {
    const settingsPath = getClaudeSettingsPath();
    await fs.ensureDir(DEFAULT_CLAUDE_CONFIG_PATH);

    // Load existing settings and merge
    const existingSettings = await loadClaudeSettings() || {};
    const mergedSettings = {
      ...existingSettings,
      ...settings
    };

    await fs.writeFile(
      settingsPath,
      JSON.stringify(mergedSettings, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Error saving Claude settings:', error);
    throw error;
  }
}

// Direct write — no re-read/merge. Use for removal operations.
export async function writeClaudeSettingsDirect(settings: ClaudeSettings): Promise<void> {
  try {
    const settingsPath = getClaudeSettingsPath();
    await fs.ensureDir(DEFAULT_CLAUDE_CONFIG_PATH);
    await fs.writeFile(
      settingsPath,
      JSON.stringify(settings, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Error writing Claude settings:', error);
    throw error;
  }
}

export function getBaseUrl(region: 'international' | 'china'): string {
  return region === 'international'
    ? DEFAULT_BASE_URL_INTERNATIONAL
    : DEFAULT_BASE_URL_CHINA;
}

export function getClaudeEnvConfig(config: MiniMaxConfig): Record<string, string> {
  return {
    ANTHROPIC_BASE_URL: config.base_url,
    ANTHROPIC_AUTH_TOKEN: config.api_key,
    API_TIMEOUT_MS: config.api_timeout_ms,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    ANTHROPIC_MODEL: config.model,
    ANTHROPIC_SMALL_FAST_MODEL: config.model,
    ANTHROPIC_DEFAULT_SONNET_MODEL: config.model,
    ANTHROPIC_DEFAULT_OPUS_MODEL: config.model,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: config.model
  };
}

export async function backupClaudeSettings(): Promise<string | null> {
  const settingsPath = getClaudeSettingsPath();
  const settingsExists = await fs.pathExists(settingsPath);

  if (settingsExists) {
    const backupPath = path.join(
      CONFIG_DIR,
      `settings.backup.${Date.now()}.json`
    );
    await fs.copy(settingsPath, backupPath);
    return backupPath;
  }

  return null;
}

export async function restoreClaudeSettings(backupPath: string): Promise<void> {
  const settingsPath = getClaudeSettingsPath();
  const backupExists = await fs.pathExists(backupPath);

  if (backupExists) {
    await fs.copy(backupPath, settingsPath);
  }
}

export async function listBackups(): Promise<string[]> {
  const configDir = getConfigDir();
  const files = await fs.readdir(configDir);
  return files
    .filter(f => f.startsWith('settings.backup.') && f.endsWith('.json'))
    .map(f => path.join(configDir, f));
}

// MCP Configuration
export interface MCPServerConfig {
  command: string;
  args: string[];
  env: {
    MINIMAX_API_KEY: string;
    MINIMAX_API_HOST: string;
  };
}

export interface ClaudeMCPConfig {
  mcpServers?: {
    MiniMax?: MCPServerConfig;
  };
}

export function getClaudeJsonPath(): string {
  return path.join(os.homedir(), '.claude.json');
}

export async function loadClaudeJson(): Promise<ClaudeMCPConfig | null> {
  try {
    const jsonPath = getClaudeJsonPath();
    const jsonExists = await fs.pathExists(jsonPath);
    if (!jsonExists) {
      return {};
    }

    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    return JSON.parse(jsonContent) as ClaudeMCPConfig;
  } catch (error) {
    console.error('Error loading Claude JSON:', error);
    return null;
  }
}

export async function saveClaudeJson(config: ClaudeMCPConfig): Promise<void> {
  try {
    const jsonPath = getClaudeJsonPath();

    // Load existing config and merge
    const existingConfig = await loadClaudeJson() || {};
    const mergedConfig = {
      ...existingConfig,
      ...config
    };

    await fs.writeFile(
      jsonPath,
      JSON.stringify(mergedConfig, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Error saving Claude JSON:', error);
    throw error;
  }
}

// Direct write — no re-read/merge. Use for removal operations.
export async function writeClaudeJsonDirect(config: ClaudeMCPConfig): Promise<void> {
  try {
    const jsonPath = getClaudeJsonPath();
    await fs.writeFile(
      jsonPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Error writing Claude JSON:', error);
    throw error;
  }
}

export async function enableMCP(config: MiniMaxConfig): Promise<void> {
  const apiHost = config.region === 'international'
    ? 'https://api.minimax.io'
    : 'https://api.minimaxi.com';

  const mcpConfig: ClaudeMCPConfig = {
    mcpServers: {
      MiniMax: {
        command: 'uvx',
        args: [
          'minimax-coding-plan-mcp',
          '-y'
        ],
        env: {
          MINIMAX_API_KEY: config.api_key,
          MINIMAX_API_HOST: apiHost
        }
      }
    }
  };

  await saveClaudeJson(mcpConfig);
}

export async function disableMCP(): Promise<void> {
  const config = await loadClaudeJson();
  if (config?.mcpServers?.MiniMax) {
    delete config.mcpServers.MiniMax;

    // If no MCP servers left, remove the mcpServers key
    if (Object.keys(config.mcpServers).length === 0) {
      delete config.mcpServers;
    }

    await writeClaudeJsonDirect(config);
  }
}

export async function isMCPEnabled(): Promise<boolean> {
  const config = await loadClaudeJson();
  return config?.mcpServers?.MiniMax !== undefined;
}

export function getVSCodeSettingsPath(): string {
  return path.join(DEFAULT_VSCODE_SETTINGS_PATH, 'settings.json');
}

export interface VSCodeEnvironmentVariable {
  name: string;
  value: string;
}

export interface VSCodeSettings {
  'claudeCode.selectedModel'?: string;
  'claudeCode.environmentVariables'?: VSCodeEnvironmentVariable[];
}

export async function loadVSCodeSettings(): Promise<VSCodeSettings | null> {
  try {
    const settingsPath = getVSCodeSettingsPath();
    const settingsExists = await fs.pathExists(settingsPath);
    if (!settingsExists) {
      return {};
    }

    const settingsContent = await fs.readFile(settingsPath, 'utf-8');
    return JSON.parse(settingsContent) as VSCodeSettings;
  } catch (error) {
    console.error('Error loading VS Code settings:', error);
    return null;
  }
}

export async function saveVSCodeSettings(settings: VSCodeSettings): Promise<void> {
  try {
    const settingsPath = getVSCodeSettingsPath();
    await fs.ensureDir(DEFAULT_VSCODE_SETTINGS_PATH);

    const existingSettings = await loadVSCodeSettings() || {};
    const mergedSettings = {
      ...existingSettings,
      ...settings
    };

    await fs.writeFile(
      settingsPath,
      JSON.stringify(mergedSettings, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Error saving VS Code settings:', error);
    throw error;
  }
}

// Direct write — no re-read/merge. Use for removal operations.
export async function writeVSCodeSettingsDirect(settings: VSCodeSettings): Promise<void> {
  try {
    const settingsPath = getVSCodeSettingsPath();
    await fs.ensureDir(DEFAULT_VSCODE_SETTINGS_PATH);
    await fs.writeFile(
      settingsPath,
      JSON.stringify(settings, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Error writing VS Code settings:', error);
    throw error;
  }
}

export function getVSCodeEnvConfig(config: MiniMaxConfig): VSCodeEnvironmentVariable[] {
  return [
    { name: `${STORAGE_KEY_PREFIX}ANTHROPIC_BASE_URL`, value: config.base_url },
    { name: `${STORAGE_KEY_PREFIX}ANTHROPIC_AUTH_TOKEN`, value: config.api_key },
    { name: `${STORAGE_KEY_PREFIX}API_TIMEOUT_MS`, value: config.api_timeout_ms },
    { name: `${STORAGE_KEY_PREFIX}CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, value: '1' },
    { name: `${STORAGE_KEY_PREFIX}ANTHROPIC_MODEL`, value: config.model },
    { name: `${STORAGE_KEY_PREFIX}ANTHROPIC_SMALL_FAST_MODEL`, value: config.model },
    { name: `${STORAGE_KEY_PREFIX}ANTHROPIC_DEFAULT_SONNET_MODEL`, value: config.model },
    { name: `${STORAGE_KEY_PREFIX}ANTHROPIC_DEFAULT_OPUS_MODEL`, value: config.model },
    { name: `${STORAGE_KEY_PREFIX}ANTHROPIC_DEFAULT_HAIKU_MODEL`, value: config.model }
  ];
}

export async function applyVSCodeExtensionConfig(config: MiniMaxConfig): Promise<void> {
  const vscodeSettings: VSCodeSettings = {
    'claudeCode.selectedModel': config.model,
    'claudeCode.environmentVariables': getVSCodeEnvConfig(config)
  };

  await saveVSCodeSettings(vscodeSettings);
}

export async function removeVSCodeExtensionConfig(): Promise<void> {
  const settings = await loadVSCodeSettings();
  if (!settings) return;

  delete settings['claudeCode.selectedModel'];
  delete settings['claudeCode.environmentVariables'];

  await writeVSCodeSettingsDirect(settings);
}

export async function isVSCodeExtensionConfigured(): Promise<boolean> {
  const settings = await loadVSCodeSettings();
  return !!(settings?.['claudeCode.selectedModel'] || settings?.['claudeCode.environmentVariables']);
}

export async function tryClaudeMCPRemove(): Promise<boolean> {
  try {
    await execAsync('claude mcp remove MiniMax');
    return true;
  } catch {
    return false;
  }
}
