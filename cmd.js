'use strict';

const {
  getCommand
} = require('./util');

const command = getCommand();

command.run().then(() => process.exit(0)).catch(() => process.exit(1));