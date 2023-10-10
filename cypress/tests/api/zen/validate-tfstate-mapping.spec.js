import { data } from '../../../fixtures/tfstate-mapping.json'
import { createCloudScanProfile, doCloudScanThroughProfile, doIaCScan, getCloudScanStatus, waitForCloudScanToFinish, updateEnv } from '../../../requests/projects'
import { getGlobalResourcesData, getRepoIdsForProject, onboardRepoToProject, waitForRepoStatusReady } from '../../../requests/repositoriesAndResources'
import { initAPISpecRoutine, letsWait, _tenSeconds, _fourtySeconds, _sixtySeconds, _threeSeconds } from '../../../support/utils'

const store = {
  // roleArn: 'arn:aws:iam::536274239938:role/orgNameio-connector_dev', region: 'ca-central-1', vpcID: 'vpc-0dcfc6c7488b848c7'
}

describe('Core Operations - AWS - Resource mapping via tfstate', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))


  //--------------------- Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  data.allIaCRepos.forEach((repoData, k) => {
    it(`MUST - Project: ${repoData.envs[0].name} - skipTest: ${repoData.skipTest}, skipValidations: ${repoData.skipValidations}`, () => {
      if (repoData.skipTest) { /* Do nothing */ } else {
        cy.request(onboardRepoToProject(repoData)).then(response => {
          expect(response.status).to.eq(202)
          expect(response.body[0].id).to.not.be.empty
          store.envID = response.body[0].id
        })
          .then(connectCloudAccountToTheProject => {
            cy.request(updateEnv(
              {
                "id": store.envID, "cloudAccountID": { [Cypress.env('cloudAccountIDs').aws_536274239938]: { vpcId: Cypress.env("awsVPCID"), region: Cypress.env("awsRegion") } }
              }
            )).then(response => {
              expect(response.status).to.eq(204)
            })
          })
          .then(() => {
            letsWait("wait for the project to soak...", _tenSeconds)
            cy.request(getRepoIdsForProject(store.envID)).then(response => {
              store.repoIDs = response.body.repoIds
            })
          })//for loop for repo id.
          .then(() => {
            // Run IaC Scan
            cy.request(doIaCScan(store.envID)).then(response => {
              expect(response.status).to.eq(202)
              waitForRepoStatusReady(store.repoIDs)
            })
          })
          .then(() => {
            // Run Cloud Scan
            cy.request(createCloudScanProfile(store.envID, { is_default: false, name: repoData.envs[0].name, options: { resource_types: ["s3"], "vm_assess_opts": [] } }))
              .then(response => {
                store.csProfileID = response.body.profile_id
              }).then(runCloudScan => {
                // Run cloud scan
                cy.request(doCloudScanThroughProfile(store.envID, store.csProfileID)).then(response => {
                  expect(response.status).to.eq(202)
                  letsWait("wait cloudscan status to be initialized...", _threeSeconds)
                  waitForCloudScanToFinish(store.envID, store.envName)
                  cy.request(getCloudScanStatus(store.envID)).then((csResponse) => {
                    expect(csResponse.body[0].cloud_scan_summary.scan_status).to.be.oneOf(["Successful", "Completed with errors"])
                  })
                })
              })
              .then(validateFilterResource => {
                cy.request(getGlobalResourcesData(`environmentId=${store.envID}&hasState=true`)).then((response) => {
                  expect(response.body.count).to.be.above(0)
                  expect(response.body.resources[0].type).to.eq("aws_s3_bucket")
                })
              })
          })
      }
    })
  })
})
