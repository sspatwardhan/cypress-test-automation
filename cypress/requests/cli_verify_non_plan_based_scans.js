/**-------------------------------------------------------------
 * Description: calls related to Integrations
 ---------------------------------------------------------------*/
import { getPipelineSummary, downloadCLI, whichCLI } from '../requests/cli_and_downloads'

//Validate basic CLI CMDs like help and version
function validateBasicCLICommands(_OS) {
     const expectedOutput = "© 2022 Accurics - All Rights Reserved."
     downloadCLI()
     cy.exec(`cd ${Cypress.config().downloadsFolder}; ./${whichCLI()} version`).then(({ stdout: version }) => {
          expect(version).to.include(`Accurics cli v${Cypress.env("cliVersion")}`)
     })
     cy.exec(`cd ${Cypress.config().downloadsFolder}; ./${whichCLI() + " help"}`, { failOnNonZeroExit: false }).then(({ stdout: help }) => {
          expect(help).to.include(`© ${new Date().getFullYear()} Accurics - All Rights Reserved.`)
     })
}

//CFT Non Plan based assessment - pipeline mode - without project config - monitoring policy group
function validateCFTNonPlanInPipelineModeMonitoringPolicy(repoUrl, repoName, projectID, apiToken, engineType) {
     const repoExtractPath = `${Cypress.config().downloadsFolder}/${repoName}_pipeline`
     let cmd = ''
     downloadCLI()
     if (engineType === 'cft') {
          cmd = `scan cf -mode=pipeline -appurl=${Cypress.config().baseUrl} -token=${apiToken} -project=${projectID}`
     }
     else {
          cmd = `scan  -mode=pipeline -appurl=${Cypress.config().baseUrl} -token=${apiToken} -project=${projectID}`
     }
     //Clone the bitbucket repo to cli_extract
     cy.exec(`git clone ${repoUrl} ${repoExtractPath};`)
          .then(_moveCLIToRepoFolder => {
               cy.exec(`cp -rp ${Cypress.config().downloadsFolder}/${whichCLI()} ${repoExtractPath}`)
          })
          .then(_runAccuricsPlanInPipelineMode => {
               if (projectID) {
                    cy.log("Running pipeline with project")
                    cy.exec(`cd ${repoExtractPath}; ./${whichCLI()} ${cmd}`, { failOnNonZeroExit: false })
                         .then(({ stdout: planCMDOutput, code: cmdExecCode, stderr: planCMDError }) => {
                              expect(planCMDOutput).to.include(`Summary of violations detected by Accurics CLI`)
                              expect(cmdExecCode).to.eq(0)
                         })
               }
               else {
                    cy.log("Running pipeline without project")
                    cy.exec(`cd ${repoExtractPath}; ./${whichCLI()} ${cmd}`, { failOnNonZeroExit: false })
                         .then(({ stdout: planCMDOutput, code: cmdExecCode, stderr: planCMDError }) => {
                              cy.log(planCMDOutput)
                              expect(planCMDOutput).to.include(`Summary of violations detected by Accurics CLI`)
                              expect(cmdExecCode).to.eq(0)
                         })
               }
          })
          .then(_validateResultFiles => {
               cy.readFile(`${repoExtractPath}/accurics_report.html`).should('exist')
               cy.readFile(`${repoExtractPath}/accurics_report.json`).should('exist')
          })
     cy.request(getPipelineSummary()).then(summary => {
          var targetPipelines = summary.body.pipelines.filter(function (pipeline) {
               return pipeline.repository == `${repoUrl}`;
          })
          expect(targetPipelines[0].totalRuns).to.be.above(0)
          expect(targetPipelines[0].severities['HIGH']).to.be.above(0)
     })
}

//Non Plan based assessment - pipeline mode - without project config - monitoring policy group
function validateNonPlanInPipelineModeMonitoringPolicy(repoUrl, repoName, forceFail, projectID, apiToken) {
     const repoExtractPath = `${Cypress.config().downloadsFolder}/${repoName}_pipeline`
     let cmd = ''
     if (forceFail) {
          cmd = `scan  -mode=pipeline -appurl=${Cypress.config().baseUrl} -token=${apiToken} -project=${projectID} -fail`
     }
     else {
          cmd = `scan  -mode=pipeline -appurl=${Cypress.config().baseUrl} -token=${apiToken} -project=${projectID}`
     }
     cy.log(cmd)
     downloadCLI()
     //Clone the bitbucket repo to cli_extract
     cy.exec(`git clone ${repoUrl} ${repoExtractPath};`)
          .then(_moveCLIToRepoFolder => {
               cy.exec(`cp -rp ${Cypress.config().downloadsFolder}/${whichCLI()} ${repoExtractPath}`)
          })
          .then(_runAccuricsPlanInPipelineMode => {
               if (projectID) {
                    cy.log("Running pipeline with project")
                    cy.exec(`cd ${repoExtractPath}; ./${whichCLI()} ${cmd}`, { failOnNonZeroExit: false, timeout: 100000 })
                         .then(({ stdout: planCMDOutput, code: cmdExecCode, stderr: planCMDError }) => {
                              if (forceFail) {
                                   expect(planCMDOutput).to.include(`Summary of violations detected by Accurics CLI`)
                                   expect(planCMDError).to.include(`Error: detected IaC violations`)
                                   expect(cmdExecCode).to.eq(1)
                              }
                              else {
                                   expect(planCMDOutput).to.include(`Summary of violations detected by Accurics CLI`)
                                   expect(cmdExecCode).to.eq(0)
                              }

                         })
               }
               else {
                    cy.log("Running pipeline without project")
                    cy.exec(`cd ${repoExtractPath}; ./${whichCLI()} ${cmd}`, { failOnNonZeroExit: false, timeout: 100000 })
                         .then(({ stdout: planCMDOutput, code: cmdExecCode, stderr: planCMDError }) => {
                              if (forceFail) {
                                   expect(planCMDOutput).to.include(`Summary of violations detected by Accurics CLI`)
                                   expect(planCMDError).to.include(`Error: detected IaC violations`)
                                   expect(cmdExecCode).to.eq(1)
                              }
                              else {
                                   expect(planCMDOutput).to.include(`Summary of violations detected by Accurics CLI`)
                                   expect(cmdExecCode).to.eq(0)
                              }
                         })
               }
          })
          .then(_validateResultFiles => {
               cy.readFile(`${repoExtractPath}/accurics_report.html`).should('exist')
               cy.readFile(`${repoExtractPath}/accurics_report.json`).should('exist')
          })
     cy.request(getPipelineSummary()).then(summary => {
          var targetPipelines = summary.body.pipelines.filter(function (pipeline) {
               return pipeline.repository == `${repoUrl}`;
          })
          expect(targetPipelines[0].totalRuns).to.be.above(0)
          expect(targetPipelines[0].severities['HIGH']).to.be.above(0)
     })

}

//Non Plan based assessment - pipeline mode - without project config - enforcing policy group
function validateNonPlanInPipelineModeEnforcingPolicy(repoUrl, repoName, _plan, projectID, apiToken) {
     const repoExtractPath = `${Cypress.config().downloadsFolder}/${repoName}_pipeline`
     let cmd = `scan  -mode=pipeline -appurl=${Cypress.config().baseUrl} -token=${apiToken} -project=${projectID}`
     downloadCLI()
     //Clone the bitbucket repo to cli_extract
     cy.exec(`git clone ${repoUrl} ${repoExtractPath};`)
          .then(_moveCLIToRepoFolder => {
               cy.exec(`cp -rp ${Cypress.config().downloadsFolder}/${whichCLI()} ${repoExtractPath}`)
          })
          .then(_runAccuricsPlanInPipelineMode => {
               if (projectID) {
                    cy.log("Running pipeline with project")
                    cy.exec(`cd ${repoExtractPath}; ./${whichCLI()} ${cmd}`, { failOnNonZeroExit: false, timeout: 100000 })
                         .then(({ stdout: planCMDOutput, code: cmdExecCode, stderr: planCMDError }) => {
                              expect(planCMDOutput).to.include(`Summary of violations detected by Accurics CLI`)
                              //If there are voilations 
                              if(cmdExecCode === 1){
                                   expect(cmdExecCode).to.eq(1)
                                   expect(planCMDError).to.include(`Error: detected IaC violations`)
                              }
                         })
               }
               else {
                    cy.log("Running pipeline without project")
                    cy.exec(`cd ${repoExtractPath}; ./${whichCLI()} ${cmd}`, { failOnNonZeroExit: false, timeout: 100000 })
                         .then(({ stdout: planCMDOutput, code: cmdExecCode, stderr: planCMDError }) => {
                              expect(planCMDOutput).to.include(`Summary of violations detected by Accurics CLI`)
                               //If there are voilations 
                               if(cmdExecCode === 1){
                                   expect(cmdExecCode).to.eq(1)
                                   expect(planCMDError).to.include(`Error: detected IaC violations`)
                              }

                         })
               }
          })
          .then(_validateResultFiles => {
               cy.readFile(`${repoExtractPath}/accurics_report.html`).should('exist')
               cy.readFile(`${repoExtractPath}/accurics_report.json`).should('exist')
          })
     cy.request(getPipelineSummary()).then(summary => {
          cy.log(summary.body.pipelines[0].repository)
          var targetPipelines = summary.body.pipelines.filter(function (pipeline) {
               return pipeline.repository == `${repoUrl}`;
          })
          expect(targetPipelines[0].totalRuns).to.be.above(0)
          expect(targetPipelines[0].severities['HIGH']).to.be.above(0)
     })

}

export {
     validateNonPlanInPipelineModeMonitoringPolicy, validateCFTNonPlanInPipelineModeMonitoringPolicy, validateNonPlanInPipelineModeEnforcingPolicy, validateBasicCLICommands
}