import inquirer from 'inquirer';
import chalk from 'chalk';
import { authSet, authApply } from './auth.js';
import { loadConfig } from '../utils/config.js';
import { logger, printBox } from '../utils/logger.js';

export async function runInitWizard(): Promise<void> {
  // Clear console and show welcome
  console.clear();

  printBox([
    chalk.bold.cyan('MiniMax Helper for Claude Code'),
    '',
    'Configure Claude Code to use MiniMax-M2.1 model',
    'Press ^C at any time to quit'
  ]);

  logger.blank();

  // Check if already configured
  const existingConfig = await loadConfig();
  if (existingConfig && existingConfig.api_key) {
    const { reconfigure } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'reconfigure',
        message: 'MiniMax is already configured. Do you want to reconfigure?',
        default: false
      }
    ]);

    if (!reconfigure) {
      logger.info('Exiting. Use `mmhelper auth` to manage your configuration.');
      return;
    }
  }

  // Step 1: Welcome
  logger.title('Step 1: Welcome');
  logger.blank();
  logger.info('This wizard will help you:');
  logger.info('  1. Set up your MiniMax API key');
  logger.info('  2. Configure Claude Code to use MiniMax-M2.1');
  logger.blank();

  const { ready } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ready',
      message: 'Ready to begin?',
      default: true
    }
  ]);

  if (!ready) {
    logger.info('Exiting. Run `mmhelper init` when you\'re ready.');
    return;
  }

  // Step 2: Get API Key
  console.clear();
  logger.title('Step 2: API Key');
  logger.blank();
  logger.info('You need a MiniMax API key to continue.');
  logger.blank();
  logger.info('Get your API key from:');
  logger.info(chalk.cyan('  https://platform.minimax.io/'));
  logger.blank();

  const { hasApiKey } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasApiKey',
      message: 'Do you have your API key ready?',
      default: true
    }
  ]);

  if (!hasApiKey) {
    logger.info('Please get your API key and run `mmhelper init` again.');
    logger.info('Visit: https://platform.minimax.io/');
    return;
  }

  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Enter your MiniMax API Key:',
      mask: '*',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'API Key cannot be empty';
        }
        return true;
      }
    }
  ]);

  // Step 3: Select Region
  console.clear();
  logger.title('Step 3: Select Region');
  logger.blank();
  logger.info('Choose the region closest to you for better performance:');
  logger.blank();

  const { region } = await inquirer.prompt([
    {
      type: 'list',
      name: 'region',
      message: 'Select your region:',
      choices: [
        {
          name: 'International (api.minimax.io)',
          value: 'international',
          short: 'International'
        },
        {
          name: 'China (api.minimaxi.com)',
          value: 'china',
          short: 'China'
        }
      ],
      default: 'international'
    }
  ]);

  // Step 4: Confirm and Apply
  console.clear();
  logger.title('Step 4: Configuration Summary');
  logger.blank();

  const baseUrl = region === 'international'
    ? 'https://api.minimax.io/anthropic'
    : 'https://api.minimaxi.com/anthropic';

  logger.info('Your configuration:');
  logger.blank();
  logger.info(`  Region:   ${chalk.cyan(region)}`);
  logger.info(`  Base URL: ${chalk.cyan(baseUrl)}`);
  logger.info(`  Model:    ${chalk.cyan('MiniMax-M2.1')}`);
  logger.blank();

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Apply this configuration?',
      default: true
    }
  ]);

  if (!confirm) {
    logger.info('Configuration cancelled.');
    return;
  }

  // Save and apply configuration
  console.clear();
  logger.title('Applying Configuration');
  logger.blank();

  try {
    await authSet(apiKey.trim(), region);

    logger.blank();
    logger.title('Setup Complete!');
    logger.blank();
    logger.success('MiniMax has been configured for Claude Code.');
    logger.blank();
    logger.info('Next steps:');
    logger.info('  1. Restart Claude Code if it\'s running');
    logger.info('  2. Open a project and run: ' + chalk.cyan('claude'));
    logger.info('  3. Enjoy coding with MiniMax-M2.1!');
    logger.blank();
    logger.info('Useful commands:');
    logger.info('  ' + chalk.cyan('mmhelper auth show') + '  - Show configuration');
    logger.info('  ' + chalk.cyan('mmhelper doctor') + '      - Run health check');
    logger.info('  ' + chalk.cyan('mmhelper --help') + '       - Show all commands');
  } catch (error) {
    logger.blank();
    logger.error('Failed to apply configuration.');
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}
