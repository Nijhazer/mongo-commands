const commandLineArgs = require('command-line-args'),
  MongoClient = require('mongodb').MongoClient,
  parseMongoURL = require('parse-mongo-url'),
  path = require('path'),
  util = require('../util');

const remoteDBURI = process.env['MONGODB'],
  parsedRemoteDBURI = parseMongoURL(remoteDBURI),
  remoteDBName = parsedRemoteDBURI.dbName,
  localDBURI = process.env['MONGODB_LOCAL'],
  parsedLocalDBURI = parseMongoURL(localDBURI),
  localDBName = parsedLocalDBURI.dbName,
  baseParamDefs = [];

class BaseCommand {
  constructor(options = {}) {
    for (let optionKey of Object.keys(options)) {
      this[optionKey] = options[optionKey];
    }
    console.log(`Invoking command: ${this.name}`);
  }

  setup() {
    const paramDefs = baseParamDefs.concat(this.paramDefs || []);
    this.params = commandLineArgs(paramDefs, {
      partial: true
    });
    for (let paramDef of paramDefs) {
      if (typeof this.params[paramDef.name] === "undefined") {
        throw new Error(`Param '${paramDef.name}' is required.`);
      }
    }
  }

  async loadInput() {
    const inputPath = path.join(__dirname, '..', 'data', `${this.name}.dat`);
    try {
      const input = await util.readFile(inputPath);
      this.input = input;
    } catch (e) {
      this.input = null;
    }
  }

  async loadCSVInput(headings) {
    await this.loadInput();
    this.input = await util.parseCSVData(this.input, headings);
  }

  async getLocalDB() {
    this.localClient = await MongoClient.connect(localDBURI);
    return this.localClient.db(localDBName);
  }

  async getRemoteDB() {
    this.remoteClient = await MongoClient.connect(remoteDBURI);
    return this.remoteClient.db(remoteDBName);
  }

  closeConnections() {
    if (this.remoteClient) {
      this.remoteClient.close();
    }
    if (this.localClient) {
      this.localClient.close();
    }
  }
}

module.exports = BaseCommand;