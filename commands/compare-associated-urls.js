const BaseCommand = require('./base');

class CompareAssociatedURLs extends BaseCommand {
  async run() {
    console.log('Loading CSV input...');
    await this.loadCSVInput([
      'collection_id',
      'collection_slug',
      'collection_hide_from_homepage',
      'associated_gallery',
      'associated_gallery_located_by',
      'target_content_slug',
      'contents'
    ]);
    console.log('Done. Processing input...');
    const targetSlugToAssociatedURLMap = this.input.reduce((map, item) => {
      map[item['target_content_slug']] = {
        slug: item['target_content_slug'],
        associatedGallery: item['associated_gallery'],
        locatedBy: item['associated_gallery_located_by']
      };
      return map;
    }, {});
    const targetSlugs = Object.keys(targetSlugToAssociatedURLMap);
    console.log(`${this.input.length} rows, ${targetSlugs.length} entries in map`);
    try {
      const remoteDB = await this.getRemoteDB();
      console.log('Fetching data from Mongo...');
      const docs = await remoteDB.collection('contents').find({
        'slug': {
          '$in': targetSlugs
        }
      }, {
        projection: {
          'slug': 1,
          'associated.url': 1
        }
      }).toArray();
      console.log(`Fetched ${docs.length} documents.`);
      this.closeConnections();
      let nullOnMongo = [];
      let populatedOnMongo = [];
      let agreesWithMongo = [];
      let disagreesWithMongo = [];
      for (let doc of docs) {
        const slug = doc.slug;
        const mapEntry = targetSlugToAssociatedURLMap[slug];
        if (!doc.associated && mapEntry.associatedGallery) {
          nullOnMongo.push(mapEntry);
          continue;
        }
        if (doc.associated && !mapEntry.associatedGallery) {
          populatedOnMongo.push(mapEntry);
          continue;
        }
        if (doc.associated) {
          let associatedSlug = doc.associated[0].url.split('/').pop();
          if (mapEntry.associatedGallery == associatedSlug) {
            agreesWithMongo.push(mapEntry);
          } else {
            if (mapEntry.associatedGallery) {
              disagreesWithMongo.push(mapEntry);
            }
          }
        } else {
          if (!mapEntry.associatedGallery) {
            agreesWithMongo.push(mapEntry);
          }
        }
      }
      console.log(`Total input rows: ${this.input.length}`);
      console.log(`Total Mongo results: ${docs.length}`);
      console.log(`Input has associated slug, but Mongo has nothing: ${nullOnMongo.length}`);
      console.log(`Input has no associated slug, but Mongo has one: ${populatedOnMongo.length}`);
      console.log(`Input agrees with Mongo: ${agreesWithMongo.length}`);
      console.log(`Input disagrees with Mongo: ${disagreesWithMongo.length}`);
      console.log('---------------');
      nullOnMongo.map(item => console.log(`${item.locatedBy} | ${item.slug} | ${item.associatedGallery}`));
      console.log('Done.');
    } catch (err) {
      console.error(err.stack);
    }
  }
}

module.exports = CompareAssociatedURLs;