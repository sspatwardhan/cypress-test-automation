import { data } from '../../../../fixtures/webhook.spec.json'
import { getRepoIdsForProject, onboardRepoToProject, waitForExpectedWebhookStatus, isTcsWebhook, associateRepoToProject } from '../../../../requests/repositoriesAndResources'
import { initAPISpecRoutine, _tenSeconds, _fourtySeconds, _sixtySeconds, _threeSeconds, _fiveSeconds, letsWait } from '../../../../support/utils'


const store = {
}

describe('Crud Operations - Verify webhook CRUD operations', () => {
  before(() => initAPISpecRoutine('before'))
  after(()=> initAPISpecRoutine('after'))


  //--------------------- Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Tushar
   * Test Management ID:
   * [Spat]: Skipping for known reasons - APE-11721, APE-11736 and
   * ^^ could be the same reason for waitForExpectedWebhookStatus doesn't receive webhook: false even after
   * repository isn't associated to any project
  ---------------------------------------------------------*/
  data.allIaCRepos.forEach((repoData, k) => {
    it.skip(`MUST - Webhook validation - Project: ${repoData.envs[0].name} - skipTest: ${repoData.skipTest}`, () => {
      if (repoData.skipTest) { /* Do nothing */ }
      else {
        cy.request(onboardRepoToProject(repoData)).then(response => {
          expect(response.status).to.eq(202)
          expect(response.body[0].id).to.not.be.empty
          store.envID = response.body[0].id
          // empty repo IDs
          store.repoIDs=[]
        })
        .then(() => {
            letsWait("wait for the repo. association to reflect..",_fiveSeconds)
            cy.request(getRepoIdsForProject(store.envID)).then(response => {
              store.repoIDs = response.body.repoIds
            })
        })
        .then(() => {
          cy.log('Checking webhook status post onboarding..')
          waitForExpectedWebhookStatus(store.repoIDs[0],true)
          waitForExpectedWebhookStatus(store.repoIDs[1],true)
        })
        // Dissociate first repo
        .then((disAssociateFirstRepoFromProject) => {
          cy.request(associateRepoToProject({
            "id": store.envID,
            "overrideRepos": true,
            "repoIds": [store.repoIDs[1]]
          })).then(response => {
            expect(response.status).to.eq(204)
          })
        })
        // Webhook should now be false as the repo. is not associated to any project
        .then(() => {
          waitForExpectedWebhookStatus(store.repoIDs[0],false)
        })
        // Dissociate second repo
        .then((disAssociateRepo0FromProject) => {
          cy.request(associateRepoToProject({
            "id": store.envID,
            "overrideRepos": true,
            "repoIds": []
          })).then(response => {
            expect(response.status).to.eq(204)
          })
        })
        // Webhook should now be false as the repo. is not associated to any project
        .then(() => {
          waitForExpectedWebhookStatus(store.repoIDs[1],false)
        })
      }
    })
  })
})
