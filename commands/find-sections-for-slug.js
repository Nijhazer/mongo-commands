const BaseCommand = require('./base');

class FindSectionsForSlug extends BaseCommand {
  async run() {
    console.log('Loading CSV input...');
    await this.loadCSVInput([
      'slug'
    ]);
    console.log('Done. Processing input...');
    const db = await this.getRemoteDB();
    console.log(`"slug","issue","section_slugs"`);
    for (let row of this.input) {
      if (row['slug'] === 'slug') {
          continue;
      }
      const slug = row['slug'];
      const sections = await db.collection('contents').find({
        slug
      }, {
        projection: {
          'section.slug': 1
        }
      }).toArray();
      let sectionSlugs = sections.map(item => item.section.slug);
      let issue = '';
      if (sectionSlugs.length === 1 && sectionSlugs[0] === 'news') {
          continue;
      } else if (sectionSlugs.length === 0) {
          issue = 'No articles found for this slug';
      } else if (sectionSlugs.indexOf('news') === -1) {
          if (sectionSlugs.length === 1 && sectionSlugs[0] === 'blog') {
              issue = 'Blog section';
          } else if (sectionSlugs.length > 1) {
              issue = 'Slug found in more than one section';
          } else {
              issue = 'Slug found in non-News, non-Blog section';
          }
      } else {
          issue = 'Unknown';
      }
      console.log(`"${slug}","${issue}","${sectionSlugs.join(', ')}"`);
    }
  }
}

module.exports = FindSectionsForSlug;