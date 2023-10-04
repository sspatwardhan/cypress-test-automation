
/**-------------------------------------------------------------
 * Description: calls related to Integrations
 ---------------------------------------------------------------*/
import { getPipelineSummary, downloadCLI, whichCLI } from '../requests/cli_and_downloads'

//Plan based assessment - pipeline mode - without project config - monitoring policy group
function validatePlanInPipelineModeMonitoringPolicy(repoUrl, repoName, forceFail, projectID, apiToken) {
     //Construct accurics command
     const repoExtractPath = `${Cypress.config().downloadsFolder}/${repoName}_pipeline`
     let cmd = ''
     if (forceFail) {
          cmd = `plan  -mode=pipeline -appurl=${Cypress.config().baseUrl} -token=${apiToken} -project=${projectID} -fail`
     }
     else {
          cmd = `plan  -mode=pipeline -appurl=${Cypress.config().baseUrl} -token=${apiToken} -project=${projectID}`
     }
     downloadCLI()
     //Clone the bitbucket repo to cli_extract
     cy.exec(`git clone ${repoUrl} ${repoExtractPath};`)
          .then(moveCLIToRepoFolder => {
               cy.exec(`cp -rp ${Cypress.config().downloadsFolder}/${whichCLI()} ${repoExtractPath}`)
          })
          .then(runAccuricsInit => {
               cy.exec(`cd ${repoExtractPath}; ./${whichCLI()} init  -no-color -reconfigure`, { timeout: 200000 }).then(({ stdout: initCMDOutput }) => {
                    expect(initCMDOutput).to.include("Terraform has been successfully initialized!")
               })
          })
          .then(runAccuricsPlanInPipelineMode => {
               if (projectID) {
                    cy.log("Running pipeline with project")
                    cy.exec(`export AWS_ACCESS_KEY_ID=XXXXXXXXXXXX;
                    export AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXX;
                    export AWS_SESSION_TOKEN=XXXXXXXXXXXX;
                    export AWS_SECURITY_TOKEN=XXXXXXXXXXXX; cd ${repoExtractPath}; ./${whichCLI()} ${cmd}`, { failOnNonZeroExit: false, timeout: 300000 })
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
                    cy.exec(`export AWS_ACCESS_KEY_ID=ASIAQ3MA62DV2ICLPVKF;
                    export AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXX;
                    export AWS_SESSION_TOKEN=XXXXXXXXXXXX;
                    export AWS_SECURITY_TOKEN=XXXXXXXXXXXX;
                    cd ${repoExtractPath}; ./${whichCLI()} ${cmd}`, { failOnNonZeroExit: false, timeout: 300000 })
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
          .then(validateResultFiles => {
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
//Plan based assessment - pipeline mode - without project config - enforcing policy group
function validatePlanInPipelineModeEnforcingPolicy(repoUrl, repoName, plan, projectID, apiToken) {
     const repoExtractPath = `${Cypress.config().downloadsFolder}/${repoName}_pipeline`
     let cmd = `plan  -mode=pipeline -appurl=${Cypress.config().baseUrl} -token=${apiToken} -project=${projectID}`
    
     downloadCLI()
     //Clone the bitbucket repo to cli_extract
     cy.exec(`git clone ${repoUrl} ${repoExtractPath};`)
          .then(moveCLIToRepoFolder => {
               cy.exec(`cp -rp ${Cypress.config().downloadsFolder}/${whichCLI()} ${repoExtractPath}`)
          })
          .then(runAccuricsInit => {
               cy.exec(`cd ${repoExtractPath}; ./${whichCLI()} init  -no-color -reconfigure`, { timeout: 100000 }).then(({ stdout: initCMDOutput }) => {
                    expect(initCMDOutput).to.include("Terraform has been successfully initialized!")
               })
          })
          .then(runAccuricsPlanInPipelineMode => {
               if (projectID) {
                    cy.log("Running pipeline with project")
                    cy.exec(`export AWS_ACCESS_KEY_ID=ASIAQ3MA62DV2ICLPVKF;
                    export AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXX;
                    export AWS_SESSION_TOKEN=XXXXXXXXXXXX;
                    export AWS_SECURITY_TOKEN=XXXXXXXXXXXX; cd ${repoExtractPath}; ./${whichCLI()} ${cmd}`, { failOnNonZeroExit: false, timeout: 100000 })
                         .then(({ stdout: planCMDOutput, code: cmdExecCode, stderr: planCMDError }) => {
                              expect(planCMDOutput).to.include(`Summary of violations detected by Accurics CLI`)
                              expect(planCMDError).to.include(`Error: detected IaC violations`)
                              expect(cmdExecCode).to.eq(1)


                         })
               }
               else {
                    cy.log("Running pipeline without project")
                    cy.exec(`export AWS_ACCESS_KEY_ID=ASIAQ3MA62DV2ICLPVKF;
                    export AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXX;
                    export AWS_SESSION_TOKEN=XXXXXXXXXXXX;
                    export AWS_SECURITY_TOKEN=XXXXXXXXXXXX; cd ${repoExtractPath}; ./${whichCLI()} ${cmd}`, { failOnNonZeroExit: false, timeout: 100000 })
                         .then(({ stdout: planCMDOutput, code: cmdExecCode, stderr: planCMDError }) => {
                              expect(planCMDOutput).to.include(`Summary of violations detected by Accurics CLI`)
                              expect(planCMDError).to.include(`Error: detected IaC violations`)
                              expect(cmdExecCode).to.eq(1)

                         })
               }
          })
          .then(validateResultFiles => {
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
     validatePlanInPipelineModeMonitoringPolicy, validatePlanInPipelineModeEnforcingPolicy
}