const fs = require('fs'),
  path = require('path'),
  commandsPath = path.resolve(path.join(__dirname, 'commands'));

function getCommand() {
  if (process.argv.length < 3) {
    throw new Error('You need to provide the name of a command that you want to run. Available commands are listed in the ./commands directory.');
  }
  const commandName = process.argv[2].trim().toLowerCase();
  const results = fs.readdirSync(commandsPath);
  if (!results.includes(`${commandName}.js`)) {
    throw new Error(`You requested command '${commandName}', but there is no command by that name in the ./commands directory.`);
  }
  const commandModule = require(`./commands/${commandName}`);
  return new commandModule();
}

module.exports = {
  getCommand
};