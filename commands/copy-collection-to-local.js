const MongoClient = require('mongodb').MongoClient,
  parseMongoURL = require('parse-mongo-url');

const BaseCommand = require('./base');

const remoteDBURI = process.env['MONGODB'],
      parsedRemoteDBURI = parseMongoURL(remoteDBURI),
      remoteDBName = parsedRemoteDBURI.dbName,
      localDBURI = process.env['MONGODB_LOCAL'],
      parsedLocalDBURI = parseMongoURL(localDBURI),
      localDBName = parsedLocalDBURI.dbName;

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
      const remoteClient = await MongoClient.connect(remoteDBURI);
      const remoteDB = remoteClient.db(remoteDBName);
      const docs = await fetchAllDocsInCollection(remoteDB, collectionName);
      console.log(`Copying ${docs.length} documents from remote DB to local collection '${collectionName}'...`);
      remoteClient.close();
      const localClient = await MongoClient.connect(localDBURI);
      const localDB = localClient.db(localDBName);
      await dropCollectionIfExists(localDB, collectionName);
      await createCollection(localDB, collectionName, docs);
      localClient.close();
      console.log('Done.');
    } catch (err) {
      console.error(err.stack);
    }
  }
}

module.exports = CopyCollectionToLocal;