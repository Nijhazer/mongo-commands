const BaseCommand = require('./base');

const ObjectID = require('mongodb').ObjectID;


class CopyCollections extends BaseCommand {
  async run() {
    console.log('Loading CSV input...');
    await this.loadCSVInput([
      'collection_id',
    ]);
    const inputRows = this.input.slice(1);
    const fetchRequest = inputRows.reduce((req, item) => {
        req._id.$in.push(new ObjectID(item.collection_id));
        return req;
    }, {
        '_id': {
            '$in': []
        }
    });
    try {
      console.log(`Fetching ${inputRows.length} collections from remote Mongo DB...`);
      const remoteDB = await this.getRemoteDB();
      const collections = await remoteDB.collection('collection').find(fetchRequest).toArray();
      console.log(`${collections.length} collections fetched.`);
      const targetDB = await this.getLocalDB();
      console.log(`Writing collections to target Mongo DB...`);
      await targetDB.collection('collection').insertMany(collections);
      console.log('Collections written.');
      console.log('Closing DB connections...');
      this.closeConnections();
      console.log('Done.');
    } catch (err) {
      console.error(err.stack);
    }
  }
}

module.exports = CopyCollections;