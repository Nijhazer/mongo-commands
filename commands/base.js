const commandLineArgs = require('command-line-args');

const baseParamDefs = [];

class BaseCommand {
  setup() {
    const paramDefs = baseParamDefs.concat(this.paramDefs || []);
    this.params = commandLineArgs(paramDefs, {
      partial: true
    });
    for (let paramDef of paramDefs) {
      if (typeof this.params[paramDef.name] === "undefined") {
        throw new Error(`Param '${paramDef.name}' is required.`);
      }
    }
  }
}

module.exports = BaseCommand;