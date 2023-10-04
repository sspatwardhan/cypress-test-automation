import { createCloudScanProfile, doCloudScanThroughProfile, updateEnv, doIaCScan, getCloudScanStatus, verifyViolations, waitForCloudScanToFinish, getCloudScanExceptions, getFilteredViolations, getResourcesByProjectId } from '../../../requests/projects'
import { getGlobalResourcesData, onboardReposThroughProject, waitForRepoStatusReady } from '../../../requests/repositoriesAndResources'
import { initAPISpecRoutine, getSpecBasedNamePrefix, letsWait, _twentySeconds, _fifteenSeconds, _tenSeconds } from '../../../support/utils'
import { onboardCloudAccount } from '../../../requests/cloudAccounts'
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper';

const name = getSpecBasedNamePrefix();
const store = {
  envName: `${name + Date.now()}`,
  cloudAccountDisplayName: `cloud_account_${new Date().getTime()}`
}

describe('Core Operations - GCP', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))

  //-------------- Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - GCP - Onboard bitbucket repositories to a project', () => {
    onboardReposThroughProject({
      envs: [{ name: store.envName, provider: "gcp", botIds: [] }],
      repos: [
        { provider: "gcp", url: getUrlByName("NAU_009"), name: getUrlByName("NAU_009").replace('https://bitbucket.org/tenb-qa/', '') + `-${store.envName.toLowerCase()}`, engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_gcp_repos") }, { key: "TERRASCAN", value: "true" }], folderPath: "/", autoRemediate: "none", source: getUrlByName("NAU_009").replace('https://bitbucket.org/', '') }]

    })

    cy.get('@envDetails')
    .then((response) => {
      store.envID = response[0]
      store.gcpRepo1ID = response[1]
    })
  })

  /**--------------------------------------------------------
    * Added by: Arti
    * Test Management ID:
   ---------------------------------------------------------*/
  it('MUST - GCP  - Verify it gives appropriate error while trying to add existing cloud account', () => {
    cy.request(onboardCloudAccount(
      [{ isDiscoveryEnabled: false, provider: "gcp", credential: { "serviceAccountCredentials": Cypress.env("gcpCredentials") } }]
    ))
    .then((response) => {
      expect(response.status).to.eq(202);
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * last modified by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('BAT  - MUST - GCP - Add Cloud Account to project', () => {
    cy.request(updateEnv(
      {
        "id": store.envID, "cloudAccountID": { [Cypress.env('cloudAccountIDs').gcp_performance_resources]: {} }
      }
    ))
    .then(response => {
      expect(response.status).to.eq(204)
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - GCP - Trigger IaC Scan', () => {
    cy.request(doIaCScan(store.envID))
    .then(response => {
      expect(response.status).to.eq(202)
    })
    .then(waitForReposToBeScanned => {
      waitForRepoStatusReady(store.gcpRepo1ID[0])
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - GCP - Run cloud scan and wait until it finishes', () => {
    cy.request(createCloudScanProfile(store.envID, { is_default: false, name: store.envName, options: { resource_types: Cypress.env("gcpCloudResourcesToBeScannedWithProfile"), "vm_assess_opts": [] } }))
    .then(response => {
      store.csProfileID = response.body.profile_id
    })
    .then(runCloudScan => {
      // Run cloud scan
      cy.request(doCloudScanThroughProfile(store.envID, store.csProfileID))
      .then(response => {
        store.groupScanId = response.body.id
        expect(response.status).to.eq(202)
        waitForCloudScanToFinish(store.envID, store.envName)
        cy.request(getCloudScanStatus(store.envID))
        .then((csResponse) => {
          expect(csResponse.body[0].cloud_scan_summary.scan_status).to.be.oneOf(["Successful", "Completed with errors"])
          store.cloudScanStatus = csResponse.body[0].cloud_scan_summary.scan_status
        })
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - GCP - validates the resource results for Cloud', () => {
    letsWait("Waiting for CMDB to compile results...", _twentySeconds)
    //Validate statistics
    cy.request(getGlobalResourcesData(`environmentId=${store.envID}&hasCloud=true`))
    .then(resResponse => {
      expect(resResponse.status).to.eq(200)
      //Validate resources
      expect(resResponse.body.count).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - GCP - validates the resource results for Iac', () => {
    letsWait("Waiting for CMDB to compile results...", _twentySeconds)
    //Validate statistics
    cy.request(getGlobalResourcesData(`environmentId=${store.envID}&hasIac=true`))
    .then(resResponse => {
      expect(resResponse.status).to.eq(200)
      //Validate resources
      expect(resResponse.body.count).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - GCP - Validate Violations', () => {
    letsWait("wait for the project to soak...", _tenSeconds)
    cy.request(getFilteredViolations(store.envID, "&hasIac=true&hasViolation=true"))
    .then(serverResp => {
      expect(serverResp.status).to.eq(200);
      store.serverResp = serverResp;
    })
    cy.request(getResourcesByProjectId(store.envID))
    .then(uiResp => {
      expect(uiResp.status).to.eq(200);
      store.uiResp = uiResp;
    })
    .then(() => {
      const serverStats = store.serverResp.body.types;
      const uiProjects = store.uiResp.body.projects[store.uiResp.body.projects.length - 1];
      expect(serverStats.length).to.gte(uiProjects.policyViolationsIac)
    })
    verifyViolations(store.envID)
  })

  // /**--------------------------------------------------------
  // * Added by: Arti
  // * Test Management ID:
  // ---------------------------------------------------------*/
  // it('MUST - GCP - Validate Drifts', () => {
  //   verifyDrifts(store.envID)
  // })

  /**--------------------------------------------------------
     * Added by: Revati
     * Test Management ID:
    ---------------------------------------------------------*/
  it('MUST - GCP - Validate Cloud Scan Exceptions ', () => {
    cy.request(getCloudScanExceptions(store.groupScanId))
    .then(response => {
      expect(response.status).to.eq(200)
      if (store.cloudScanStatus == "Completed with errors") {
        expect(response.body.failures.length).to.gt(0)
      }
      else (store.cloudScanStatus == "Successful")
      {
        expect(response.body.failures == "null")
      }
    })
  })
})




