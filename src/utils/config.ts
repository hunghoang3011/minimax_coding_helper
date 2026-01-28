import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

export interface MiniMaxConfig {
  api_key: string;
  region: 'international' | 'china';
  base_url: string;
  model: string;
  api_timeout_ms: string;
  claude_code_path: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.minimax-helper');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.yaml');

export const DEFAULT_BASE_URL_INTERNATIONAL = 'https://api.minimax.io/anthropic';
export const DEFAULT_BASE_URL_CHINA = 'https://api.minimaxi.com/anthropic';
export const DEFAULT_MODEL = 'MiniMax-M2.1';
export const DEFAULT_API_TIMEOUT = '3000000';

const DEFAULT_CLAUDE_CONFIG_PATH = path.join(os.homedir(), '.claude');

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
