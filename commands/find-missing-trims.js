const BaseCommand = require('./base');

class FindMissingTrims extends BaseCommand {
  async run() {
    const db = await this.getRemoteDB();
    const models = await db.collection('vehicle_models').find({
        'primary_chrome_id': {
            '$ne': null
        }
    }, {
        projection: {
            'primary_chrome_id': 1,
            'model': 1,
            'url_slug': 1
        }
    }).toArray();
    const modelMap = models.reduce((coll, model) => {
        coll[model.primary_chrome_id] = model;
        return coll;
    }, {});
    const trims = await db.collection('vehicle_trims').find({}, {
        projection: {
            'chrome_id': 1
        }
    }).toArray();
    for (let trim of trims) {
        delete modelMap[trim.chrome_id];
    }
    for (let id of Object.keys(modelMap)) {
        console.log(`${id}: ${modelMap[id].url_slug}`);
    }
  }
}

module.exports = FindMissingTrims;