const commandLineArgs = require('command-line-args'),
  MongoClient = require('mongodb').MongoClient,
  parseMongoURL = require('parse-mongo-url');

const remoteDBURI = process.env['MONGODB'],
  parsedRemoteDBURI = parseMongoURL(remoteDBURI),
  remoteDBName = parsedRemoteDBURI.dbName,
  localDBURI = process.env['MONGODB_LOCAL'],
  parsedLocalDBURI = parseMongoURL(localDBURI),
  localDBName = parsedLocalDBURI.dbName,
  baseParamDefs = [];

class BaseCommand {
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

  async getLocalDB() {
    this.localClient = await MongoClient.connect(localDBURI);
    return this.localClient.db(localDBName);
  }

  async getRemoteDB() {
    this.remoteClient = await MongoClient.connect(remoteDBURI);
    return this.remoteClient.db(remoteDBName);
  }

  closeConnections() {
    this.remoteClient.close();
    this.localClient.close();
  }
}

module.exports = BaseCommand;