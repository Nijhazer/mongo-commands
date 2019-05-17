const _ = require('lodash');

const BaseCommand = require('./base');

const ObjectID = require('mongodb').ObjectID;


class CleanRegion extends BaseCommand {
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
    const cards = await remoteDB.collection('card').find({
        "_id": {
            "$in": cardIds.map(id => new ObjectID(id))
        }
    }).toArray();
    let updateRequests = [];
    for (let card of cards) {
        const type = _.get(card, 'metadata.type', '');
        if (!['chart', 'table'].includes(type)) {
            continue;
        }
        let updateRequestBody = {
            "$set": {
                "authorId": "admin",
                "metadata.userId": "admin"
            },
            "$unset": {}
        };
        let regID, valueKey;
        switch (type) {
            case 'chart':
                valueKey = 'data.dimensions.reg_id';
                regID = _.get(card, valueKey);
                if (regID && !Array.isArray(regID)) {
                    updateRequestBody.$unset[valueKey] = 1;
                }
                break;
            case 'table':
                for (let key of ['columns', 'rows']) {
                    valueKey = `data.${key}`;
                    const values = _.get(card, valueKey);
                    let update = false;
                    let valueUpdates = [];    
                    if (values) {
                        for (let i = 0, item; i < values.length; i++) {
                            item = values[i];
                            if (item.dimension === 'reg_id' && !Array.isArray(item.values)) {
                                update = true;
                            } else {
                                valueUpdates.push(item);
                            }
                        }
                    }
                    if (update) {
                        updateRequestBody.$set[valueKey] = valueUpdates;
                    }
                }
                valueKey = 'data.filters.reg_id';
                regID = _.get(card, valueKey);
                if (regID && !Array.isArray(regID)) {
                    updateRequestBody.$unset[`${valueKey}`] = 1;
                }
                break;
        }
        if (Object.keys(updateRequestBody.$unset).length === 0) {
            delete updateRequestBody["$unset"];
        }
        updateRequests.push({
            "where": {
                "_id": card._id
            },
            "body": updateRequestBody
        });
    }
    if (updateRequests.length === 0) {
        console.info("No updates needed");
    } else {
        const collection = remoteDB.collection("card");
        for (let { where, body } of updateRequests) {
            try {
                console.log(where, 'Updating...');
                const response = await collection.updateOne(where, body);
            } catch (e) {
                console.error(e, 'error');
            }
        }
    }
    this.closeConnections();
    console.log('Done.');
  }
}

module.exports = CleanRegion;