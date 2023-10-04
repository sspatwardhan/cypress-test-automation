import { validatePlanInPipelineModeMonitoringPolicy, validatePlanInPipelineModeEnforcingPolicy } from '../../../requests/cli_verify_plan_based_scans'
import { createAPIAuthToken } from '../../../requests/integrations'
import { cleanSlate, createEnv } from '../../../requests/projects'
import { data } from '../../../fixtures/cli-plan.spec.json'
import { getSpecBasedNamePrefix } from '../../../support/utils'
import { getCloudProviderDefaultPolicyID, createPolicyGroup } from '../../../requests/policy-groups-and-policies'
const store = {
  envName: `${getSpecBasedNamePrefix() + Date.now()}`
}

describe('Core Operations CLI - AWS', () => {
  before(() => {
    cy.login().then(cleanUp => { cleanSlate() })
      .then(gettingApiToken => {
        //create API token
        cy.request(createAPIAuthToken()).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body.appToken.length).to.eq(36)
          store.apiAuthToken = response.body.appToken
        })
      })
  })

  /**--------------------------------------------------------
    * Added by: rbade
    * Test Management ID: 
  ---------------------------------------------------------*/
  data.allIaCRepos.repos.forEach((repoData, k) => {
    it('MUST - Linux/Mac - Plan based assessment - pipeline mode - without project config - Enforcing policy group', () => {
      cy.request(getCloudProviderDefaultPolicyID('aws')).then((policyResponse) => {
        expect(policyResponse.status).to.eq(200)
        store.policyID = policyResponse.body
      })
      .then(createProjectWithDefaultPolicy => {
        cy.request(createEnv({
          provider: "aws",
          name: `${getSpecBasedNamePrefix() + Date.now()}`,
          policies: [store.policyID]
        })).then((envResponse) => {
          expect(envResponse.status).to.eq(200)
          expect(envResponse.body.id).to.not.be.empty
          store.project_id = envResponse.body.id
        })
      })
      cy.request(createPolicyGroup({
        name: `${getSpecBasedNamePrefix() + Date.now() + "-AWS-Enforcing"}`,
        envId: store.project_id,
        engineType: "terraform",
        provider: "aws",
        version: "v1",
        benchmark: "AWS Best Practices",
        mode: "enforcing",
        ruleNames: ["containerDefinitionContainsDATABASE", "iamSlrPolicyWildCardActionNotResource", "esDomainExposed", "noS3BucketSseRulesKmsBased", "efsNotEncrypted", "efsIsPublic", "awsCloudWatchLogGrpNatGwCheck", "instanceWithPublicIp"]
      }))
      .then((response) => {
        expect(response.status).to.eq(200);
        store.policyIDEnforced = response.body.id
      })
      .then(createProjectWithEnforcedPolicy => {
        cy.request(createEnv({
          provider: "aws",
          name: `${getSpecBasedNamePrefix() + Date.now()}`,
          policies: [store.policyIDEnforced]
        })).then((envResponse) => {
          expect(envResponse.status).to.eq(200)
          expect(envResponse.body.id).to.not.be.empty
          store.enforced_project_id = envResponse.body.id
        })
      })
      .then(runTest => {
        validatePlanInPipelineModeEnforcingPolicy(repoData.url, repoData.name, true, store.enforced_project_id, store.apiAuthToken)
      })
    })

    /**--------------------------------------------------------
      * Added by: rbade
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Linux/Mac - Plan based assessment - pipeline mode - without project config - Monitoring policy group - force fail', () => {
      validatePlanInPipelineModeMonitoringPolicy(repoData.url, repoData.name, true, store.project_id, store.apiAuthToken)
    })

    /**--------------------------------------------------------
      * Added by: rbade
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Linux/Mac - Plan based assessment - pipeline mode - without project config - monitoring policy group', () => {
      validatePlanInPipelineModeMonitoringPolicy(repoData.url, repoData.name, false, store.project_id, store.apiAuthToken)
    })
  })
})