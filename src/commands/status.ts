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
    if (claudeSettings?.env?.ANTHROPIC_BASE_URL) {
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

  if (configured && applied) {
    const regionLabel = region === 'china' ? 'China' : 'International';
    const mcpLabel = mcp ? 'enabled' : 'disabled';
    logger.success(`MiniMax active (${model || 'unknown'}, ${regionLabel}) — MCP: ${mcpLabel}`);
  } else if (configured) {
    logger.warning('MiniMax configured but not applied — run: mmhelper auth apply');
  } else {
    logger.error('MiniMax not configured — run: mmhelper init');
  }
}
