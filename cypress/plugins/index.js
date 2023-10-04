/// <reference types="cypress" />

/**
 * @type {Cypress.PluginConfig}
 */

// // To support multiple config files
// const path = require("path");
// const fs = require("fs-extra");
// function getConfigurationFileByEnvName(env) {
//   const fileLocation = path.resolve("cypress/config", `${env}.json`);
//   console.log(`BAT: Using ${env} config. Set appropriate parameters here - cypress/config/${env}.json, otherwise the tests will fail.`)
//   return fs.readJson(fileLocation);
// }

// module.exports = (on, config) => {
//   // To support multiple config files
//   const envFile = config.env.configFile || "qa-milestone";
//   return getConfigurationFileByEnvName(envFile);
// }