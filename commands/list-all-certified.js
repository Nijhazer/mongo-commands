const _ = require('lodash');

const BaseCommand = require('./base');

const ObjectID = require('mongodb').ObjectID;


class ListAllCertified extends BaseCommand {
  async run() {
    const remoteDB = await this.getRemoteDB();
    const collections = await remoteDB.collection('collection').find({
        "metadata.certified": true,
    }, {
        projection: {
            "_id": 1,
            "children": 1
        }
    }).toArray();
    let collectionIds = collections.reduce((coll, item) => {
        if (item.children && item.children.length > 0) {
            return coll.concat(item.children.map(child => `${child.id}`));
        }
        return coll.concat(`${item._id}`);
    }, []);
    const collectionCards = await remoteDB.collection('collection').find({
        "_id": {
            "$in": collectionIds.map(id => new ObjectID(id))
        }
    }, {
        projection: {
            "_id": 1,
            "metadata.title": 1,
            "cards": 1,
            "children": 1
        }
    }).toArray();
    const cardIds = collectionCards.reduce((coll, item) => {
        return coll.concat(item.cards.map(card => `${card.id}`));
    }, []);
    const compositeCards = await remoteDB.collection('card').find({
        "_id": {
            "$in": cardIds.map(id => new ObjectID(id)),
        },
        "metadata.type": "composite",
        "children.1": {
            "$exists": true
        }
    }, {
        projection: {
            "children": 1
        }
    }).toArray();
    for (let compositeCard of compositeCards) {
        for (let child of compositeCard.children) {
            cardIds.push(`${child.id}`);
        }
    }
    this.closeConnections();
    let collectionStrs = collectionIds.map(collectionId => `ObjectId("${collectionId}")`);
    let cardStrs = cardIds.map(cardId => `ObjectId("${cardId}")`);
    console.log('# collection ids');
    console.log(collectionStrs.join(', '));
    console.log('');
    console.log('# card ids');
    console.log(cardStrs.join(', '));
  }
}

module.exports = ListAllCertified;