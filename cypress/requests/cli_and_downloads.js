import { getUrlByName } from './apiAndNonApiUrlsMapper'
/**-------------------------------------------------------------
 * Description: calls related to Integrations
 ---------------------------------------------------------------*/
function whichCLI() {
     return Cypress.platform === 'darwin' ? `accurics_mac` : `accurics_linux`
}
function downloadCLI() {
     //Clean downloads folder
     cy.exec(`rm -rf ${Cypress.config().downloadsFolder}/*`, { failOnNonZeroExit: false })
     //Download the CLI and validate filename
     cy.exec(`wget ${getUrlByName('NAU_001')}/${Cypress.env('cliVersion')}/${whichCLI()} -P ${Cypress.config().downloadsFolder}; chmod +x ${Cypress.config().downloadsFolder}/${whichCLI()}`, { timeout: 300000 })
     // .then(validateExtract => {
     //      cy.exec(`ls -al ${Cypress.config().downloadsFolder} | awk '{print $9}'`).then(({ stdout: extractedFileNames }) => {
     //           cy.log(extractedFileNames)
     //           expect(extractedFileNames).to.include('accurics_')
     //      })
     // }
     // )
}

const path = require("path");
function downloadAndVerifyAllCLIs() {
     const supportedOperatingSystems = ['macos_arm64','macos_x86_64','linux_arm64','linux_x86_64','windows_x86_64']
     let path = Cypress.config().downloadsFolder
     supportedOperatingSystems.forEach(os => {     
          //Clean downloads folder
          cy.exec(`rm -rf ${Cypress.config().downloadsFolder}/*`, { failOnNonZeroExit: false })
          //Download the CLIs from /version endpoint and validate
          //Added condition based download as cli for windows has different file name format
          if(os.includes('windows')){    
               let file = `/accurics-cli_${Cypress.env('cliVersion')}_${os}.zip`
               cy.exec(`wget ${getUrlByName('NAU_001')}/accurics-cli_${Cypress.env('cliVersion')}_${os}.zip -P ${Cypress.config().downloadsFolder};`, { timeout: 300000 })   
               .then(extractAndValidateFile => {     
                 cy.task('unzipping', { path, file })
                 .then((response)=>{
                   expect(response[1].path).to.be.equal('accurics.exe')
                 })
               })
          }
          else{
               cy.exec(`wget ${getUrlByName('NAU_001')}/accurics-cli_${Cypress.env('cliVersion')}_${os}.tar.gz -P ${Cypress.config().downloadsFolder}; `, { timeout: 300000 })
               .then(extractAndValidateFile => {
                 cy.exec(`tar -xvf ${Cypress.config().downloadsFolder}/accurics-cli_${Cypress.env('cliVersion')}_${os}.tar.gz --directory ${Cypress.config().downloadsFolder}`)
                 .then((response)=>{
                   expect(response.stderr).contains('accurics')
                 })
               })
          }
          //Clean downloads folder
          cy.exec(`rm -rf ${Cypress.config().downloadsFolder}/*`, { failOnNonZeroExit: false })
          
          //Download the CLIs from /latest endpoint and validate
          //Added condition based download as cli for windows has different file name format
          if(os.includes('windows')){
               let file = `/accurics-cli_latest_${os}.zip`
               cy.exec(`wget ${getUrlByName('NAU_001')}/accurics-cli_latest_${os}.zip -P ${Cypress.config().downloadsFolder};`, { timeout: 300000 })
               .then(extractAndValidateFile => {     
                 cy.task('unzipping', { path, file })
                 .then((response)=>{
                   expect(response[1].path).to.be.equal('accurics.exe')
                   })
               })
          }
          else{
               cy.exec(`wget ${getUrlByName('NAU_001')}/accurics-cli_latest_${os}.tar.gz -P ${Cypress.config().downloadsFolder};`, { timeout: 300000 })
               .then(extractAndValidateFile => {
                 cy.exec(`tar -xvf ${Cypress.config().downloadsFolder}/accurics-cli_latest_${os}.tar.gz --directory ${Cypress.config().downloadsFolder}`)
                 .then((response)=>{
                   expect(response.stderr).contains('accurics')
                   })
               })
          }
     });
}

function getPipelineSummary() {
     return {
          method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_031')
     }
}

function downloadBot(botID) {
     return {
          method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: `${getUrlByName('AU_032')}/${botID}/download`
     }
}

export {
     downloadAndVerifyAllCLIs, getPipelineSummary, downloadCLI, downloadBot, whichCLI
}