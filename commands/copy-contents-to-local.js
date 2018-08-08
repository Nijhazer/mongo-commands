const BaseCommand = require('./base');

class CopyContentsToLocal extends BaseCommand {
  constructor() {
    super();
    this.paramDefs = [
      {
        name: 'query',
        alias: 'q'
      }
    ];
    this.setup();
  }

  async run() {
    const query = JSON.parse(this.params['query']);
    try {
      const remoteDB = await this.getRemoteDB();
      const docs = await remoteDB.collection('contents').find(query).toArray();
      console.log(`Copying ${docs.length} documents from remote to local...`);
      const localDB = await this.getLocalDB();
      await localDB.collection('contents').insertMany(docs);
      this.closeConnections();
      console.log('Done.');
    } catch (err) {
      console.error(err.stack);
    }
  }
}

module.exports = CopyContentsToLocal;