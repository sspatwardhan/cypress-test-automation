const { defineConfig } = require('cypress')
const decompress = require('decompress');
const path = require("path");
const fs = require("fs-extra");
const { rmdir } = require('fs')
const neatCsv = require('neat-csv')

function getConfigurationFileByEnvName(env) {
  const fileLocation = path.resolve("cypress/config", `${env}.json`);
  console.log(`BAT: Using ${env} config. Set appropriate parameters here - cypress/config/${env}.json, otherwise the tests will fail.`)
  return fs.readJson(fileLocation);
}

const unzip = ({ path, file }) => decompress(path + file, path + '/unzip/' + file.replace('.zip', ''))

module.exports = defineConfig({
  reusability: true,
  video: false,
  reporter: 'junit',
  reporterOptions: {
    mochaFile: 'cypress/report/results-[hash].xml',
    toConsole: true,
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      on('task', {
        'unzipping': unzip,
      })
      on('task', {
        deleteFolder(folderName) {
          console.log('deleting folder %s', folderName)
          return new Promise((resolve, reject) => {
            rmdir(folderName, { maxRetries: 10, recursive: true }, (err) => {
              if (err) {
                console.error(err)
                return reject(err)
              }
              resolve(null)
            })
          })
        }})
      on('task', {
        deleteFile(fileName){
          return fs.unlinkSync(fileName), null
        }
      })
      on('task', {
        parseCsvFile: async (filePath) => {
          try {
            const fileContent = await fs.promises.readFile(filePath, 'utf-8');
            const parsedData = await neatCsv(fileContent);
            return parsedData;
          } catch (error) {
            throw new Error(`Failed to parse CSV file: ${error.message}`);
          }
        },
      })
      const envFile = config.env.configFile || "qa-milestone";
      return getConfigurationFileByEnvName(envFile);
    },
    specPattern: 'cypress/tests/api/**/*.{js,jsx,ts,tsx}',
  },
})
