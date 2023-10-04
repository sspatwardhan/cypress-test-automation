import { data } from '../../../fixtures/iac-validator.json'
import { doIaCScan, getFilteredViolations } from '../../../requests/projects'
import { getGlobalResourcesData, getRepoIdsForProject, onboardRepoToProject, waitForRepoStatusReady } from '../../../requests/repositoriesAndResources'
import { initAPISpecRoutine, letsWait, _tenSeconds, _fourtySeconds } from '../../../support/utils'

const store = {}

describe('Core Operations - AWS - CloudFormation', () => {
  before(() => initAPISpecRoutine('before'))
  after(()=> initAPISpecRoutine('after'))

  //--------------------- Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  data.allIaCRepos.forEach((repoData, k) => {
    it(`Project: ${repoData.envs[0].name} - skipTest: ${repoData.skipTest}, skipValidations: ${repoData.skipValidations}`, () => {
      if(repoData.skipTest){ /* Do nothing */ } else {
        cy.request(onboardRepoToProject(repoData)).then(response => {
          expect(response.status).to.eq(202)
          expect(response.body[0].id).to.not.be.empty
          store.envID = response.body[0].id
        })
        .then(storeRepoIds => {
          cy.request(getRepoIdsForProject(store.envID)).then(response => {
            store.repoIDs = response.body.repoIds
          })
        })
        .then(scanProject => {
          cy.request(doIaCScan(store.envID)).then(response => {
            expect(response.status).to.eq(202)
          }).then(waitForReposToBeScanned => {
            if(!repoData.skipValidations){
              store.repoIDs.forEach((repo, i) => {
                waitForRepoStatusReady(repo)
              })
            }  
          })
        })
        .then(validateResourceCount => {
          if(!repoData.skipValidations){
            letsWait("Waiting for CMDB to compile results...", _fourtySeconds)
            cy.request(getGlobalResourcesData(`environmentId=${store.envID}&hasIac=true&hasCloud=true`)).then(resResponse => {
              expect(resResponse.status).to.eq(200)
              if(repoData.expectationIs = "greaterThan"){
                //Validate resources
                expect(resResponse.body.total).to.be.above(repoData.expectedResources)
              }
              else if(repoData.expectationIs = "lesserThan"){
                //Validate resources
                expect(resResponse.body.total).to.be.below(repoData.expectedResources)
              }
              else if(repoData.expectationIs = "equals"){
                //Validate resources
                expect(resResponse.body.total).to.eq(repoData.expectedResources)
              }
            })
          } else{cy.log ("Skipping resource count validation")}
        })
        .then(validatePolicyFailureCount => {
          if(!repoData.skipValidations){
            cy.request(getFilteredViolations(store.envID, "&hasIac=true&hasViolation=true")).then(policyFailureResp => {
              expect(policyFailureResp.status).to.eq(200)
              if(repoData.expectationIs = "greaterThan"){
                //Validate resources
                expect(policyFailureResp.body.types.length).to.be.above(repoData.expectedPolicyFailures)
              }
              else if(repoData.expectationIs = "lesserThan"){
                //Validate resources
                expect(policyFailureResp.body.types.length).to.be.below(repoData.expectedPolicyFailures)
              }
              else if(repoData.expectationIs = "equals"){
                //Validate resources
                expect(policyFailureResp.body.types.length).to.eq(repoData.expectedPolicyFailures)
              }
            })
          } else{cy.log ("Skipping policy failure count validation")}
        })
      }
    })
  })
})