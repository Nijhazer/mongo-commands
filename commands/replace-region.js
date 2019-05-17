const _ = require('lodash');

const BaseCommand = require('./base');

const ObjectID = require('mongodb').ObjectID;

const REGION_ID_TO_REPLACE = 420;
const REPLACE_REGION_ID_WITH = [32, 421, 442];


class ReplaceRegion extends BaseCommand {
  async run() {
    console.log('Loading CSV input...');
    await this.loadCSVInput([
      'collection_id',
    ]);
    const inputRows = this.input.slice(1);
    const fetchRequest = inputRows.reduce((req, item) => {
        req.collections.$in.push(new ObjectID(item.collection_id));
        return req;
    }, {
        'collections': {
            '$in': []
        }
    });
    const remoteDB = await this.getRemoteDB();
    const cards = await remoteDB.collection('card').find(fetchRequest).toArray();
    let updateRequests = [];
    for (let card of cards) {
        const type = _.get(card, 'metadata.type', '');
        if (!['chart', 'table'].includes(type)) {
            continue;
        }
        let updateRequestBody = {
            "$set": {}
        };
        switch (type) {
            case 'chart':
                const regIDKey = 'data.dimensions.reg_id';
                const regID = _.get(card, regIDKey);
                if (regID && Array.isArray(regID) && regID.includes(REGION_ID_TO_REPLACE)) {
                    updateRequestBody.$set[regIDKey] = _.uniq(regID.filter(id => id !== REGION_ID_TO_REPLACE).concat(REPLACE_REGION_ID_WITH));
                }
                break;
            case 'table':
                for (let key of ['columns', 'rows']) {
                    const valueKey = `data.${key}`;
                    const values = _.get(card, valueKey);
                    if (values) {
                        for (let i = 0, item; i < values.length; i++) {
                            item = values[i];
                            if (item.dimension === 'reg_id' && Array.isArray(item.values) && item.values.includes(REGION_ID_TO_REPLACE)) {
                                updateRequestBody.$set[`${valueKey}.${i}`] = Object.assign({}, item, {
                                    values: _.uniq(item.values.filter(id => id !== REGION_ID_TO_REPLACE).concat(REPLACE_REGION_ID_WITH))
                                });
                            }
                        }
                    }
                }
                break;
        }
        if (Object.keys(updateRequestBody.$set).length > 0) {
            updateRequests.push({
                "where": {
                    "_id": card._id
                },
                "body": updateRequestBody
            });
        }
    }
    if (updateRequests.length === 0) {
        console.info("No updates needed");
    } else {
        const collection = remoteDB.collection("card");
        for (let { where, body } of updateRequests) {
            try {
                console.log(where, 'Updating...');
                let response = await collection.updateOne(where, body);
                console.log(response);
            } catch (e) {
                console.error(e, 'error');
            }
        }
    }
    this.closeConnections();
    console.log('Done.');
  }
}

module.exports = ReplaceRegion;