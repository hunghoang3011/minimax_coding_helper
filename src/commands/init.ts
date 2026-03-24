import inquirer from 'inquirer';
import chalk from 'chalk';
import { authSet, authApply, authMCPEnable } from './auth.js';
import { quickOn, quickOff } from './toggle.js';
import { loadConfig, saveConfig, isMCPEnabled, isVSCodeExtensionConfigured, isMiniMaxApplied } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export async function runInitWizard(): Promise<void> {
  const config = await loadConfig();

  if (config?.api_key) {
    await runDashboard();
  } else {
    await runWizard();
  }
}

async function runWizard(): Promise<void> {
  logger.blank();
  console.log(chalk.cyan.bold('╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║') + chalk.white.bold('        🤖 MiniMax Helper — First-Time Setup              ') + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝'));
  logger.blank();

  console.log(chalk.white('  Welcome! Let\'s set up MiniMax for Claude Code.'));
  console.log(chalk.white('  Get your API key from: ') + chalk.cyan('https://platform.minimax.io/'));
  logger.blank();

  try {
    await authSet();
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to set API key. Please try again with: ') + chalk.cyan('mmhelper init'));
    console.log(chalk.gray('  Try: mmhelper doctor to diagnose issues'));
    return;
  }

  logger.blank();
  const { enableMCP } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableMCP',
      message: 'Enable MCP (web_search & understand_image tools)?',
      default: true
    }
  ]);

  if (enableMCP) {
    try {
      await authMCPEnable();
    } catch {
      console.log(chalk.yellow('  ⚠️  MCP setup failed. You can enable it later from the dashboard.'));
    }
  }

  logger.blank();
  console.log(chalk.bold.green('  ╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.green('  ║') + chalk.white.bold('  ✅ Setup Complete!                                       ') + chalk.bold.green('║'));
  console.log(chalk.bold.green('  ╚════════════════════════════════════════════════════════════╝'));
  logger.blank();
  console.log(chalk.white('  You can now use Claude Code with MiniMax-M2.7!'));
  console.log(chalk.white('  Run ') + chalk.cyan.bold('claude') + chalk.white(' in any workspace to start coding.'));
  logger.blank();

  await promptContinue();
  await runDashboard();
}

export async function runDashboard(): Promise<void> {
  while (true) {
    const config = await loadConfig();

    if (!config || !config.api_key) {
      console.log(chalk.yellow('⚠️  No configuration found.'));
      console.log(chalk.gray('   Running setup wizard...'));
      logger.blank();
      await runWizard();
      return;
    }

    const maskedKey = config.api_key.slice(0, 4) + '****';
    const mcpEnabled = await isMCPEnabled();
    const vscodeEnabled = await isVSCodeExtensionConfigured();
    const isApplied = await isMiniMaxApplied();

    logger.blank();
    console.log(chalk.cyan.bold('╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║') + chalk.white.bold('        🤖 MiniMax Configuration Dashboard              ') + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝'));
    logger.blank();

    console.log(chalk.white('  Current Configuration:'));
    console.log(chalk.cyan('  Model:       ') + chalk.white.bold(config.model || 'MiniMax-M2.7'));
    console.log(chalk.cyan('  Region:      ') + chalk.white.bold(config.region === 'international' ? '🌍 International' : '🇨🇳 China'));
    console.log(chalk.cyan('  API Key:     ') + chalk.green('Set (' + maskedKey + ')'));
    console.log(chalk.cyan('  Claude Code: ') + (isApplied ? chalk.green.bold('✅ MiniMax Active') : chalk.yellow('⏸️  Inactive (vanilla Claude Code)')));
    console.log(chalk.cyan('  VS Code:     ') + (vscodeEnabled ? chalk.green.bold('✅ Configured') : chalk.gray('❌ Not Configured')));
    console.log(chalk.cyan('  MCP Status:  ') + (mcpEnabled ? chalk.green.bold('✅ Enabled') : chalk.gray('❌ Disabled')));
    logger.blank();

    // Build context-aware toggle option
    const toggleOption = isApplied
      ? {
          name: chalk.yellow('⏸️  Switch to vanilla Claude Code') + ' - ' + chalk.gray('Deactivate MiniMax (mmhelper off)'),
          value: 'toggle-off',
          short: 'Deactivate'
        }
      : {
          name: chalk.green.bold('▶️  Activate MiniMax') + ' - ' + chalk.gray('Apply MiniMax config (mmhelper on)'),
          value: 'toggle-on',
          short: 'Activate'
        };

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold.cyan('Select action:'),
        choices: [
          toggleOption,
          {
            name: chalk.blue('🔌 MCP Configuration') + ' - ' + chalk.gray('Manage Model Context Protocol'),
            value: 'mcp',
            short: 'MCP'
          },
          {
            name: chalk.yellow('🔑 Change API Key') + ' - ' + chalk.gray('Update your MiniMax API key'),
            value: 'change-key',
            short: 'Change Key'
          },
          {
            name: chalk.yellow('🌍 Change Region') + ' - ' + chalk.gray('Switch between International / China'),
            value: 'change-region',
            short: 'Change Region'
          },
          new inquirer.Separator(),
          {
            name: chalk.red.bold('💣 Reset (Remove All)') + ' - ' + chalk.gray('Remove all MiniMax configuration'),
            value: 'reset',
            short: 'Reset'
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
      case 'toggle-on':
        await handleToggleOn();
        continue;
      case 'toggle-off':
        await handleToggleOff();
        continue;
      case 'mcp':
        await handleMCPMenu();
        continue;
      case 'change-key':
        await handleChangeKey();
        continue;
      case 'change-region':
        await handleChangeRegion();
        continue;
      case 'reset':
        await handleReset();
        continue;
      case 'exit':
        console.log(chalk.gray('👋 Goodbye!'));
        break;
    }
    break;
  }
}

async function handleToggleOn(): Promise<void> {
  try {
    await quickOn();
    await promptContinue();
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to activate MiniMax.'));
    console.log(chalk.gray('  Try: mmhelper doctor to check setup'));
    await promptContinue();
  }
}

async function handleToggleOff(): Promise<void> {
  try {
    await quickOff();
    await promptContinue();
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to deactivate MiniMax.'));
    console.log(chalk.gray('  Try: mmhelper reset to force clean'));
    await promptContinue();
  }
}

async function handleMCPMenu(): Promise<void> {
  while (true) {
    const mcpEnabled = await isMCPEnabled();

    logger.blank();
    console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
    console.log(chalk.bold.cyan('│') + chalk.white.bold('  🔌 MCP Configuration                                      ') + chalk.bold.cyan('│'));
    console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
    logger.blank();

    const status = mcpEnabled ? chalk.green.bold('✅ Enabled') : chalk.gray('❌ Disabled');
    console.log(chalk.white('  MCP Status: ') + status);
    logger.blank();

    if (mcpEnabled) {
      console.log(chalk.gray('  Available Tools:'));
      console.log(chalk.cyan('    • ') + chalk.white('web_search') + chalk.gray(' - Search the web'));
      console.log(chalk.cyan('    • ') + chalk.white('understand_image') + chalk.gray(' - Analyze images'));
      logger.blank();
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold.cyan('MCP Management:'),
        choices: mcpEnabled ? [
          {
            name: chalk.red('🔴 Disable MCP') + ' - ' + chalk.gray('Remove MCP from Claude Code'),
            value: 'disable',
            short: 'Disable MCP'
          },
          new inquirer.Separator(),
          {
            name: chalk.gray('⬅️  Back'),
            value: 'back',
            short: 'Back'
          }
        ] : [
          {
            name: chalk.green('🟢 Enable MCP') + ' - ' + chalk.gray('Add web_search & understand_image'),
            value: 'enable',
            short: 'Enable MCP'
          },
          new inquirer.Separator(),
          {
            name: chalk.gray('⬅️  Back'),
            value: 'back',
            short: 'Back'
          }
        ]
      }
    ]);

    logger.blank();

    switch (action) {
      case 'enable':
        try {
          await authMCPEnable();
          await promptContinue();
        } catch {
          console.log(chalk.red('  ❌ Failed to enable MCP.'));
          console.log(chalk.gray('  Try: mmhelper auth mcp enable'));
          await promptContinue();
        }
        continue;
      case 'disable': {
        const { authMCPDisable } = await import('./auth.js');
        try {
          await authMCPDisable();
          await promptContinue();
        } catch {
          console.log(chalk.red('  ❌ Failed to disable MCP.'));
          console.log(chalk.gray('  Try: mmhelper auth mcp disable'));
          await promptContinue();
        }
        continue;
      }
      case 'back':
        break;
    }
    break;
  }
}

async function handleChangeKey(): Promise<void> {
  logger.blank();
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('│') + chalk.white.bold('  🔑 Change API Key                                        ') + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
  logger.blank();

  try {
    await authSet();
    logger.blank();
    console.log(chalk.green('  ✅ API Key updated and applied!'));
    await promptContinue();
  } catch (error) {
    console.log(chalk.red('  ❌ Failed to update API key.'));
    console.log(chalk.gray('  Try: mmhelper auth set <key>'));
    await promptContinue();
  }
}

async function handleChangeRegion(): Promise<void> {
  const config = await loadConfig();
  if (!config) return;

  logger.blank();
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('│') + chalk.white.bold('  🌍 Change Region                                         ') + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
  logger.blank();

  console.log(chalk.white('  Current: ') + chalk.cyan.bold(config.region === 'international' ? '🌍 International' : '🇨🇳 China'));
  logger.blank();

  const { region } = await inquirer.prompt([
    {
      type: 'list',
      name: 'region',
      message: chalk.bold.cyan('Select region:'),
      choices: [
        { name: '🌍 International (api.minimax.io)', value: 'international' },
        { name: '🇨🇳 China (api.minimaxi.com)', value: 'china' }
      ],
      default: config.region || 'international'
    }
  ]);

  config.region = region;
  config.base_url = region === 'international'
    ? 'https://api.minimax.io/anthropic'
    : 'https://api.minimaxi.com/anthropic';

  await saveConfig(config);

  try {
    await authApply();
    logger.blank();
    console.log(chalk.green('  ✅ Region updated and configuration reapplied!'));
    await promptContinue();
  } catch (error) {
    console.log(chalk.red('  ❌ Region saved but failed to reapply configuration.'));
    await promptContinue();
  }
}

async function handleReset(): Promise<void> {
  const { runReset } = await import('./reset.js');
  await runReset();
  await promptContinue();
}

async function promptContinue(): Promise<void> {
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: chalk.gray('Press Enter to continue...')
    }
  ]);
}
