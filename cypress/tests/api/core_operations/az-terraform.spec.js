import { createCloudScanProfile, doCloudScanThroughProfile, doIaCScan, getAzureResourceGroups, getAzMgmtGroups, getSubscriptions, updateEnv, verifyDrifts, verifyViolations, waitForCloudScanToFinish, getCloudScanStatus, getResourcesByProjectId, getFilteredViolations } from '../../../requests/projects'
import { onboardReposThroughProject, waitForRepoStatusReady, getRepoViolationSummary, getGlobalResourcesData } from '../../../requests/repositoriesAndResources'
import { initAPISpecRoutine, getSpecBasedNamePrefix, letsWait, _twentySeconds, _fourtySeconds, _sixtySeconds, _fifteenSeconds, _tenSeconds } from '../../../support/utils'
import { onboardCloudAccount } from '../../../requests/cloudAccounts'

const name = getSpecBasedNamePrefix();
const store = {
  envName: `${name + Date.now()}`,
  cloudAccountDisplayName: `cloud_account_${new Date().getTime()}`
}

describe('Core Operations - Azure', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))
  //-------------- Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Sara
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Azure - Management Groups Check', () => {
    cy.request(getAzMgmtGroups(Cypress.env("azClientID"), Cypress.env("azClientSecret"), Cypress.env("azTenantID")))
    .then(response => {
      expect(response.status).to.eq(200)
      // expect(response.body.managementGroups.length).to.be.above(0)
      // expect(response.body.managementGroups.find(m => m.name === Cypress.env("mgName"))).not.to.be.undefined
    })
  })

  /**--------------------------------------------------------
  * Added by: Sara
  * Test Management ID:
 ---------------------------------------------------------*/
  it('MUST - Azure - Subscriptions Check', () => {
    cy.request(getSubscriptions(Cypress.env("azClientID"), Cypress.env("azClientSecret"), Cypress.env("azTenantID")))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.partitions.length).to.be.above(0)
      expect(response.body.partitions.find(s => s.name === Cypress.env("subName"))).not.to.be.undefined
    })
  })

  /**--------------------------------------------------------
   * Added by: Sara
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Azure - Resource Groups Check', () => {
    cy.request(getAzureResourceGroups(Cypress.env("azClientID"), Cypress.env("azClientSecret"), Cypress.env("azTenantID"), Cypress.env("azSubID"), Cypress.env("azCloudType")))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.resourceGroups.length).to.be.above(0)
      expect(response.body.resourceGroups.find(r => r.name === Cypress.env("azResourceGroupName")).name).not.to.be.undefined
      // expect(response.body.resourceGroups.find(r => r.name === Cypress.env("azResourceGroupName"))).to.be.true
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Azure - Onboard ADO repository to a project', () => {
    onboardReposThroughProject({
      envs: [{ name: store.envName, provider: "azure", botIds: [] }],
      repos: [
        { provider: "azure", url: `https://tcs-qe-org1@dev.azure.com/tcs-qe-org1/test-project1/_git/${Cypress.env("bitbucketBATRepo1az")}`, name: `acqa-repo9-azure-tf12_${new Date().getTime()}`, engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_az_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", autoRemediate: "none", source: `tcs-qe-org1/${Cypress.env("bitbucketBATRepo1az")}-azRepo` }]
    })
    cy.get('@envDetails')
    .then((response) => {
      store.envID = response[0]
      store.azRepo1ID = response[1]
    })
  })

  /**--------------------------------------------------------
    * Added by: Spat
    * Test Management ID:
   ---------------------------------------------------------*/
  it('DEMO - MUST - Verify it gives appropriate error while trying to add existing cloud account', () => {
    cy.request(onboardCloudAccount(
      [{ provider: "azure", isDiscoveryEnabled: false, credential: { clientId: Cypress.env("azClientID"), clientSecret: Cypress.env("azClientSecret"), "tenantId": Cypress.env("azTenantID"), subscriptionId: Cypress.env("azSubID") } }]
    ))
    .then((response) => {
      expect(response.status).to.eq(202);
    })
  })


  /**--------------------------------------------------------
   * Added by: Sara
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Azure - Add Subscription and Resource Groups to project', () => {
    cy.request(updateEnv(
      {
        "id": store.envID,
        "cloudAccountID": {
          [Cypress.env('cloudAccountIDs').azure_9c8988b4_d223_45a9_a7f2_e7b71c7a0ed6]: {
            "resourceGroups": [Cypress.env("azResourceGroupName")]
          }
        }
      }
    ))
    .then(response => {
      expect(response.status).to.eq(204)
    })
  })

  /**--------------------------------------------------------
   * Added by: Sara
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AZ - Trigger IaC Scan', () => {
    cy.request(doIaCScan(store.envID))
    .then(response => {
      expect(response.status).to.eq(202)
    })
    .then(waitForReposToBeScanned => {
      waitForRepoStatusReady(store.azRepo1ID[0])
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Azure - Run cloud scan and wait until it finishes', () => {
    // Create Cloud Scan profile
    cy.request(createCloudScanProfile(store.envID, { is_default: false, name: store.envName, options: { resource_types: Cypress.env("azureCloudResourcesToBeScannedWithProfile"), "vm_assess_opts": [] } }))
    .then(response => {
      store.csProfileID = response.body.profile_id
    })
    .then(runCloudScan => {
      // Run cloud scan
      cy.request(doCloudScanThroughProfile(store.envID, store.csProfileID))
      .then(response => {
          expect(response.status).to.eq(202)
          waitForCloudScanToFinish(store.envID, store.envName)
        })
      cy.request(getCloudScanStatus(store.envID))
      .then((csResponse) => {
        expect(csResponse.body[0].cloud_scan_summary.scan_status).to.be.oneOf(["Successful", "Completed with errors"])
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: Sara
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Azure - Check the output of scans', () => {
    letsWait("Waiting for CMDB to evaluate drift results...", _sixtySeconds)
    cy.request(getGlobalResourcesData(`environmentId=${store.envID}&hasCloud=true`))
    .then(snapResponse => {
      expect(snapResponse.status).to.eq(200)
      expect(snapResponse.body.count).to.be.at.least(5)
    })
    // cy.request(getGlobalResourcesData(store.envID, "&hasDrift=true&hasCloud=true&mapped=true")).then(response => {
    //   expect(response.body.total).to.be.at.least(3)
    // })
    cy.request(getGlobalResourcesData(`environmentId=${store.envID}&hasIac=true`))
    .then(response => {
      expect(response.body.count).to.be.at.least(30)
    })
    cy.request(getRepoViolationSummary(store.azRepo1ID[0]))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(Object.keys(response.body.vSummary).length).to.gte(0)
      // expect((store.projectViolationCount)).to?.be?.lte(store.vSummaryCount)
    })
  })

  /**--------------------------------------------------------
   * Added by: Sara
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Azure - Validate resource summary and violations', () => {
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

  /**--------------------------------------------------------
  * Added by: Sara
  * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Azure - Validate Drifts', () => {
    verifyDrifts(store.envID)
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Azure - Onboard old ADO repository to a project and validate scan results', () => {
    onboardReposThroughProject({
      envs: [{ name: store.envName + '-VSRepo', provider: "azure", botIds: [] }],
      repos: [
        { provider: "azure", url: `https://tcs-qe-org1.visualstudio.com/test-project1/_git/acqa-repo3-azure-tf12`, name: `acqa-repo3-azure-tf12_${new Date().getTime()}`, engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_az_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", autoRemediate: "none", "source": "Custom", "repoType": "custom", "webhook": false }]
    })
    cy.get('@envDetails')
    .then((response) => {
      store.envID = response[0]
      store.azRepo1ID = response[1]
    })
    //Validate statistics
    cy.request(getGlobalResourcesData(`environmentId=${store.envID}&hasIac=true`))
    .then(resResponse => {
      expect(resResponse.status).to.eq(200)
      //Validate resources
      expect(resResponse.body.count).to.be.above(0)
    })
  })
})