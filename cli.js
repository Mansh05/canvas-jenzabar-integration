#!/usr/bin/env node
require = require('esm')(module); // eslint-disable-line no-global-assign
const meow = require('meow');
const inquirer = require('inquirer');
const write = require('write');
const { DateTime } = require('luxon');
const path = require('path');
const main = require('./src/main').default;
const C = require('./src/constants');
const settings = require('./src/settings').default;

const { log, warn } = console;

function writeFeedfileSync(contents, { action }) {
  const feedfiletype = action
    .split(' ')
    .join('')
    .toLowerCase();
  const timestamp = DateTime.local()
    .toISODate()
    .split('-')
    .join('');
  const shorthostname = settings.canvas.hostname.replace(/\.instructure\.com/, '');
  const filename = `ff-${shorthostname}-${feedfiletype}-${timestamp}.csv`;
  const fileDest = path.join(__dirname, './tmp', filename);
  write.sync(fileDest, contents);
  return fileDest;
}

async function cli() {
  const { flags } = meow(
    `
      Usage
        $ canvas-jenzabar <options>
   
      Options
        --users        CSV of users to add/update
   
      Examples
        $ canvas-jenzabar --users
  `,
    {
      flags: {
        users: { type: 'boolean' },
      },
    },
  );

  if (flags.users) {
    const csv = await main(C.GENERATE_USERS_CSV);
    log(csv);
  }

  // if no flags prompt for action
  if (Object.values(flags).every(v => v === false)) {
    const questions = [
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [C.GENERATE_USERS_CSV],
      },
    ];
    const answers = await inquirer.prompt(questions);
    const { action } = answers;
    const csv = await main(action);
    const fileDest = writeFeedfileSync(csv, { action });
    log(csv);

    // to stderr to keep stdout clean for piping
    warn(`\n👍  Output: ${fileDest}`);
  }

  process.exit();
}

cli();
