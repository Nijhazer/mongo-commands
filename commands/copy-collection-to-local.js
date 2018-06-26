const BaseCommand = require('./base');

async function fetchAllDocsInCollection(db, collectionName) {
  return await db.collection(collectionName).find({}).toArray();
}

async function doesCollectionExist(db, collectionName) {
  const collections = await db.listCollections().toArray();
  for (let collection of collections) {
    if (collection.name === collectionName) {
      return true;
    }
  }
  return false;
}

async function createCollection(db, collectionName, initialData = null) {
  const collection = await db.createCollection(collectionName);
  if (initialData) {
    await collection.insertMany(initialData);
  }
  return collection;
}

async function dropCollectionIfExists(db, collectionName) {
  const collectionExists = await doesCollectionExist(db, collectionName);
  if (collectionExists) {
    await db.dropCollection(collectionName);
  }
}

async function getCollectionTotalDocumentCount(db, collectionName) {
  return await db.collection(collectionName).count({});
}

class CopyCollectionToLocal extends BaseCommand {
  constructor() {
    super();
    this.paramDefs = [
      {
        name: 'collection-name',
        alias: 'c'
      }
    ];
    this.setup();
  }

  async run() {
    const collectionName = this.params['collection-name'];
    try {
      const remoteDB = await this.getRemoteDB();
      const sourceDocumentCount = await getCollectionTotalDocumentCount(remoteDB, collectionName);
      if (sourceDocumentCount >= 10000) {
        console.warn(`The collection you have requested, '${collectionName}', has ${sourceDocumentCount} documents in it. Copying this collection will take a significant amount of time.`);
        this.closeConnections();
        return;
      }
      const docs = await fetchAllDocsInCollection(remoteDB, collectionName);
      console.log(`Copying ${docs.length} documents from remote DB to local collection '${collectionName}'...`);
      const localDB = await this.getLocalDB();
      await dropCollectionIfExists(localDB, collectionName);
      await createCollection(localDB, collectionName, docs);
      this.closeConnections();
      console.log('Done.');
    } catch (err) {
      console.error(err.stack);
    }
  }
}

module.exports = CopyCollectionToLocal;