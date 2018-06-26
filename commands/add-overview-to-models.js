const BaseCommand = require('./base');

class AddOverviewToModels extends BaseCommand {
  async run() {
    try {
      const localDB = await this.getLocalDB();
      const collection = await localDB.collection("vehicle_models");
      const results = await collection.updateMany(
        {
          overview: {
            $exists: false
          }
        },
        {
          $set: {
            overview: "This is a sample overview"
          }
        }
      );
      console.log(results.result);
      this.closeConnections();
      console.log('Done.');
    } catch (err) {
      console.error(err.stack);
    }
  }
}

module.exports = AddOverviewToModels;