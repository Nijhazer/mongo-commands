const BaseCommand = require('./base');

class CompareAssociatedURLs extends BaseCommand {
  async run() {
    console.log('Loading CSV input...');
    await this.loadCSVInput([
      'slug',
      'gallery_slug',
      'gallery_slug_source'
    ]);
    console.log('Done. Processing input...');
    const targetSlugToAssociatedURLMap = this.input.reduce((map, item) => {
      if (item['slug'] === 'slug') {
          return map;
      }
      if (map[item['slug']]) {
          console.log(`DUPE: ${item['slug']}`);
      }
      map[item['slug']] = {
        slug: item['slug'],
        associatedGallery: item['gallery_slug'],
        source: item['gallery_slug_source']
      };
      return map;
    }, {});
    const targetSlugs = Object.keys(targetSlugToAssociatedURLMap);
    const allSlugsMap = targetSlugs.reduce((map, slug) => {
        map[slug] = true;
        return map;
    }, {});
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
      let sourceMap = {};
      for (let doc of docs) {
        const slug = doc.slug;
        delete allSlugsMap[slug];
        const mapEntry = targetSlugToAssociatedURLMap[slug];
        let source = mapEntry.source;
        if (!sourceMap[source]) {
          sourceMap[source] = {
              'nullOnMongo': [],
              'populatedOnMongo': [],
              'agreesWithMongo': [],
              'disagreesWithMongo': []
          };
        }
        if (!doc.associated && mapEntry.associatedGallery) {
          nullOnMongo.push(mapEntry);
          sourceMap[source]['nullOnMongo'].push(`${slug} - ${mapEntry.associatedGallery}`);
          continue;
        }
        if (doc.associated && !mapEntry.associatedGallery) {
          populatedOnMongo.push(mapEntry);
          sourceMap[source]['populatedOnMongo'].push(slug);
          continue;
        }
        if (doc.associated) {
          let components = doc.associated[0].url.split('/');
          let associatedSlug;
          for (let i = components.length - 1; i >= 0; i--) {
              let check = components[i];
              if (check.trim() != '') {
                  associatedSlug = check;
                  break;
              }
          }
          if (mapEntry.associatedGallery == associatedSlug) {
            agreesWithMongo.push(mapEntry);
            sourceMap[source]['agreesWithMongo'].push(slug);
          } else {
            if (mapEntry.associatedGallery) {
              disagreesWithMongo.push(mapEntry);
              sourceMap[source]['disagreesWithMongo'].push(slug);
            }
          }
        } else {
          if (!mapEntry.associatedGallery) {
            agreesWithMongo.push(mapEntry);
            sourceMap[source]['agreesWithMongo'].push(slug);
          }
        }
      }
      let notFoundOnMongo = Object.keys(allSlugsMap);
      console.log(`Total input rows: ${this.input.length}`);
      console.log(`Total Mongo results: ${docs.length}`);
      console.log(`Not found on Mongo: ${notFoundOnMongo.length}`);
      console.log(`Input has associated slug, but Mongo has nothing: ${nullOnMongo.length}`);
      console.log(`Input has no associated slug, but Mongo has one: ${populatedOnMongo.length}`);
      console.log(`Input agrees with Mongo: ${agreesWithMongo.length}`);
      console.log(`Input disagrees with Mongo: ${disagreesWithMongo.length}`);
      console.log('---------------');
      console.log('Done.');
    } catch (err) {
      console.error(err.stack);
    }
  }
}

module.exports = CompareAssociatedURLs;