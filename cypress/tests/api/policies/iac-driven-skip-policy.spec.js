import { cleanSlate, createEnv, updateEnv, doIaCScan, getFilteredViolations } from '../../../requests/projects';
import { getCloudProviderDefaultPolicyID } from '../../../requests/policy-groups-and-policies';
import { getRepoIdsForProject, onboardRepoToProject, waitForRepoStatusReady } from '../../../requests/repositoriesAndResources';
import { initAPISpecRoutine, getSpecBasedNamePrefix, letsWait, _tenSeconds } from '../../../support/utils';

const name = getSpecBasedNamePrefix();
const store = {
  envName: `${name + Date.now()}`
}

describe('Policies', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))


  /**--------------------------------------------------------
    * Added by: Spat
    * Test Management ID:
   ---------------------------------------------------------*/
  it('MUST - Skip-Policy-Failure - Get AWS Best Practices Policy ID', () => {
    cy.request(getCloudProviderDefaultPolicyID('aws'))
      .then((policyResponse) => {
        expect(policyResponse.status).to.eq(200)
        store.policyID = policyResponse.body
      })
  })

  // /**--------------------------------------------------------
  //  * Added by: Spat
  //  * Test Management ID:
  // ---------------------------------------------------------*/
  // it('MUST - Skip-Policy-Failure - Create Project for testing policy condition', () => {
  //   cy.request(createEnv({
  //     provider: "aws",
  //     name: `${getSpecBasedNamePrefix() + Date.now()}-PolicyTest`,
  //     policies: [store.policyID]
  //   })).then(response => {
  //     expect(response.status).to.eq(200)
  //     expect(response.body.id).to.not.be.empty
  //     store.envID = response.body.id
  //   })
  // })

  /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
     * Jira ID - APE-4909
    ---------------------------------------------------------*/
  it('MUST - Skip-Policy-Failure - Add repository with branch that has ts:skip set', () => {
    cy.request(onboardRepoToProject({
      envs: [{ name: store.envName, provider: "aws", botIds: [] }],
      repos: [
        { provider: "aws", url: getUrlByName("NAU_007"), name: getUrlByName("NAU_007").replace('https://bitbucket.org/tenb-qa/', '') + `-${store.envName.toLowerCase()}`, engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", autoRemediate: "none", source: getUrlByName("NAU_007").replace('tenb-qa/', '') }],
    }))
      .then(response => {
        expect(response.status).to.eq(202)
        expect(response.body[0].id).to.not.be.empty
        store.envID = response.body[0].id
      })
  })

  // /**--------------------------------------------------------
  //    * Added by: Spat
  //    * Test Management ID:
  //   ---------------------------------------------------------*/
  // it('MUST - Skip-Policy-Failure - Add the repository to the project', () => {
  //   cy.request(updateEnv({
  //     id: store.envID,
  //     repoIds: [store.awsRepoID],
  //     provider: "aws",
  //     name: store.envName,
  //     policies: [store.policyID]
  //   })).then(response => {
  //     expect(response.status).to.eq(204)
  //   })
  // })


  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - AWS - Trigger IaC Scan and validate whether policies skipped in IaC are ignored', () => {
    letsWait("wait for the project to soak...", _tenSeconds)
    // Store Repo IDs
    cy.request(getRepoIdsForProject(store.envID))
      .then(response => {
        store.awsRepo1ID = response.body.repoIds
      })
      .then(scanProject => {
        cy.request(doIaCScan(store.envID))
          .then(response => {
            expect(response.status).to.eq(202)
          })
          .then(waitForReposToBeScanned => {
            waitForRepoStatusReady(store.awsRepo1ID)
          })
      })

    letsWait("for analysis to complete", _tenSeconds)
    //Validate IaC driven skipped policies
    cy.request(getFilteredViolations(store.envID, "&hasViolation=true&showSkipped=true"))
      .then(skippedResp => {
        expect(skippedResp.status).to.eq(200)
        expect(skippedResp.body.resourceCount).to.be.above(0)
        assert.isNotNull(skippedResp.body.types.find(skippedPolicies => skippedPolicies.name === "awsDynamoDbSseEncryptionEnabled"))
        assert.isNotNull(skippedResp.body.types.find(skippedPolicies => skippedPolicies.name === "instanceWithIMDv1"))
      })
  })

})