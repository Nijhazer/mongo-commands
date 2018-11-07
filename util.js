const fs = require('fs'),
  path = require('path'),
  csv = require('csv'),
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
  return new commandModule({
    name: commandName
  });
}

function runAsyncFileCommand(commandName, path, options = null) {
  return new Promise((resolve, reject) => {
    let args = [path];
    if (options) {
      args.push(options);
    }
    const cb = function(err, response) {
      if (err) {
        return reject(err);
      }
      return resolve(response);
    };
    args.push(cb);
    fs[commandName].apply(this, args);
  });
}

function readFile(path) {
  return runAsyncFileCommand('readFile', path, 'utf-8');
}

function parseCSVData(data, headings = []) {
  return new Promise((resolve, reject) => {
    csv.parse(data, function(err, data) {
      if (err) {
        return reject(err);
      }
      csv.transform(data, function(data) {
        let row = {};
        for (let i = 0, heading; i < headings.length; i++) {
          heading = headings[i];
          row[heading] = data[i];
        }
        return row;
      }, function(err, data) {
        if (err) {
          return reject(err);
        }
        return resolve(data);
      });
    });
  });
}

module.exports = {
  getCommand,
  readFile,
  parseCSVData
};