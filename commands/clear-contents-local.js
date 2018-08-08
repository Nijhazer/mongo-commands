const BaseCommand = require('./base');

class ClearContentsLocal extends BaseCommand {
  async run() {
    try {
      const db = await this.getLocalDB();
      console.log('Clearing local contents by rebuilding collection...');
      await db.dropCollection('contents');
      await db.createCollection('contents');
      this.closeConnections();
      console.log('Done.');
    } catch (err) {
      console.error(err.stack);
    }
  }
}

module.exports = ClearContentsLocal;