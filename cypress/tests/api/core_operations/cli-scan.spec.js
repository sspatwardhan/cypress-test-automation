import { validateNonPlanInPipelineModeMonitoringPolicy, validateCFTNonPlanInPipelineModeMonitoringPolicy, validateNonPlanInPipelineModeEnforcingPolicy, validateBasicCLICommands } from '../../../requests/cli_verify_non_plan_based_scans'
import { createAPIAuthToken } from '../../../requests/integrations'
import { cleanSlate, createEnv } from '../../../requests/projects'
import { getSpecBasedNamePrefix } from '../../../support/utils'
import { getPolicyGroups, createPolicyGroup } from '../../../requests/policy-groups-and-policies'
import { data } from '../../../fixtures/cli-scan.spec.json'
const store = {}

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
  //This test will run once
  it('MUST - Linux/Mac - CLI basic commands help and version verification', () => {
    validateBasicCLICommands()
  })
  data.allIaCRepos.repos.forEach((repoData, k) => {

    /**--------------------------------------------------------
      * Added by: rbade
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Linux/Mac - Non Plan based assessment - pipeline mode - without project config - monitoring policy group', () => {
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
      .then(runTest => {
        validateNonPlanInPipelineModeMonitoringPolicy(repoData.url, repoData.name, false, store.project_id, store.apiAuthToken)
      })
    })

    /**--------------------------------------------------------
      * Added by: rbade
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Linux/Mac - Non Plan based assessment - pipeline mode - without project config - monitoring policy group - force fail', () => {
      validateNonPlanInPipelineModeMonitoringPolicy(repoData.url, repoData.name, true, store.project_id, store.apiAuthToken)
    })

    /**--------------------------------------------------------
      * Added by: rbade
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Linux/Mac - Non Plan based assessment - pipeline mode - without project config - enforcing policy group', () => {
      cy.request(createPolicyGroup({
        name: `${getSpecBasedNamePrefix() + Date.now() + "-AWS-Enforcing"}`,
        envId: store.project_id,
        engineType: "terraform",
        provider: "aws",
        version: "v1",
        benchmark: "AWS Best Practices",
        mode: "enforcing",
        ruleNames: ["containerDefinitionContainsDATABASE", "iamSlrPolicyWildCardActionNotResource", "esDomainExposed", "noS3BucketSseRulesKmsBased", "efsNotEncrypted", "efsIsPublic", "awsCloudWatchLogGrpNatGwCheck", "instanceWithPublicIp"]
      })).then((response) => {
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
          validateNonPlanInPipelineModeEnforcingPolicy(repoData.url, repoData.name, false, store.enforced_project_id, store.apiAuthToken)
        })
    })

    /**--------------------------------------------------------
      * Added by: rbade
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Linux/Mac -CFT Non Plan based assessment - pipeline mode - without project config - monitoring policy group', () => {
      validateCFTNonPlanInPipelineModeMonitoringPolicy(repoData.url, repoData.name, store.project_id, store.apiAuthToken, repoData.engineType)
    })
  })
})