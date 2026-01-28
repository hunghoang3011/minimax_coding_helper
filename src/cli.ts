#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { runInitWizard } from './commands/init.js';
import {
  authSet,
  authShow,
  authRevoke,
  authApply,
  authPath
} from './commands/auth.js';
import { runDoctor } from './commands/doctor.js';
import { configMenu } from './commands/config.js';

const program = new Command();

program
  .name('minimax-helper')
  .description('A CLI helper for MiniMax Coding Plan Users to configure Claude Code')
  .version('1.0.0');

// Init command
program
  .command('init')
  .description('Run the interactive setup wizard')
  .action(async () => {
    try {
      await runInitWizard();
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Auth command group
const authCommand = program
  .command('auth')
  .description('Manage MiniMax API authentication');

authCommand
  .command('set [api-key]')
  .description('Set your MiniMax API key')
  .option('-r, --region <region>', 'Region: international or china', 'international')
  .action(async (apiKey, options) => {
    try {
      const region = options.region === 'china' ? 'china' : 'international';
      await authSet(apiKey, region);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

authCommand
  .command('show')
  .description('Show current authentication status')
  .action(async () => {
    try {
      await authShow();
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

authCommand
  .command('revoke')
  .description('Remove saved API key and restore Claude Code settings')
  .action(async () => {
    try {
      await authRevoke();
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

authCommand
  .command('apply')
  .description('Apply MiniMax configuration to Claude Code')
  .action(async () => {
    try {
      await authApply();
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

authCommand
  .command('path')
  .description('Show configuration file paths')
  .action(async () => {
    try {
      await authPath();
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Doctor command
program
  .command('doctor')
  .description('Run system health check')
  .action(async () => {
    try {
      await runDoctor();
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Config command - interactive menu
program
  .command('config')
  .description('Interactive configuration menu')
  .action(async () => {
    try {
      await configMenu();
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Default to init if no command provided
program.action(async () => {
  await runInitWizard();
});

program.parse();
