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

export function printBox(content: string[]): void {
  const maxLength = Math.max(...content.map(line => line.length));
  const border = '─'.repeat(maxLength + 2);

  console.log(chalk.cyan(`┌${border}┐`));
  for (const line of content) {
    const padded = line.padEnd(maxLength);
    console.log(chalk.cyan('│ ') + chalk.white(padded) + chalk.cyan(' │'));
  }
  console.log(chalk.cyan(`└${border}┘`));
}

export function printTable(headers: string[], rows: string[][]): void {
  const columnWidths = headers.map((header, i) => {
    const maxWidth = Math.max(
      header.length,
      ...rows.map(row => (row[i] || '').length)
    );
    return maxWidth + 2;
  });

  // Print header
  const headerLine = headers
    .map((header, i) => header.padEnd(columnWidths[i]))
    .join('');
  console.log(chalk.bold.cyan(headerLine));

  // Print separator
  const separator = columnWidths
    .map(width => '─'.repeat(width))
    .join('');
  console.log(chalk.gray(separator));

  // Print rows
  for (const row of rows) {
    const rowLine = row
      .map((cell, i) => (cell || '').padEnd(columnWidths[i]))
      .join('');
    console.log(rowLine);
  }
}
