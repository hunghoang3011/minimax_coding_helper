import chalk from 'chalk';
import ora, { Ora } from 'ora';

export const logger = {
  info: (message: string) => {
    console.log(chalk.blue('ℹ'), message);
  },

  success: (message: string) => {
    console.log(chalk.green('✓'), message);
  },

  warning: (message: string) => {
    console.log(chalk.yellow('⚠'), message);
  },

  error: (message: string) => {
    console.log(chalk.red('✗'), message);
  },

  title: (message: string) => {
    console.log('\n' + chalk.bold.cyan(message));
  },

  subtitle: (message: string) => {
    console.log(chalk.gray(message));
  },

  json: (data: unknown) => {
    console.log(JSON.stringify(data, null, 2));
  },

  blank: () => {
    console.log('');
  }
};

export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan'
  });
}


