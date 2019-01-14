const BaseCommand = require('./base');

class FindURLSlug extends BaseCommand {
  async run() {
    console.log('Loading CSV input...');
    await this.loadCSVInput([
      'content_id',
      'make',
      'model'
    ]);
    console.log('Done. Processing input...');
    const db = await this.getRemoteDB();
    console.log(`"content_id","make","model","url_slug"`);
    for (let row of this.input) {
        const contentID = row['content_id'];
        const make = row['make'];
        const model = row['model'];
        if (!make || !model || (make === 'make')) {
            continue;
        }
        const vehicleModelsResponse = await db.collection('vehicle_models').find({
            make,
            model
        }, {
            projection: {
                'url_slug': 1
            }
        }).toArray();
        const urlSlug = vehicleModelsResponse[0].url_slug;
        console.log(`"${contentID}","${make}","${model}",${urlSlug}"`);
    }
  }
}

module.exports = FindURLSlug;