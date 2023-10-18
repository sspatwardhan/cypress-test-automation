import { createCloudScanProfile, doCloudScanThroughProfile, getResourceCountForBillingTenant, verifyDrifts, verifyViolations, getAWSVPCs, doIaCScan, updateEnv, waitForCloudScanToFinish, getProjectCloudProvider, getCloudScanStatus, cancelCloudScanByGroupId, getHelmKubescanForProject } from '../../../requests/projects'
import { createPR, getRepoStatsByID, waitForRepoStatusReady, deleteRepo, onboardReposThroughProject } from '../../../requests/repositoriesAndResources'
import { verifyCompliantPoliciesStat } from '../../../requests/policy-groups-and-policies'
import { initAPISpecRoutine, _threeSeconds, _tenSeconds, _sixtySeconds, _fifteenSeconds, _twentySeconds, letsWait, getSpecBasedNamePrefix, getPageOffset, generateRandomNumber } from '../../../support/utils'
import { getRepos, getReposInPaginatedForm } from '../../../requests/repositoriesAndResources'
import { onboardCloudAccount } from '../../../requests/cloudAccounts'
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper'
const store = {
  envName: `${getSpecBasedNamePrefix() + Date.now()}`
}

describe('Core Operations - AWS - Terraform', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))

  //--------------------- Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Verify it gives appropriate error while trying to add existing cloud account', () => {
    cy.request(onboardCloudAccount(
      [{ provider: "aws", isDiscoveryEnabled: false, credential: { externalId: Cypress.env("awsExternalID"), rolearn: Cypress.env("awsRoleARN") } }]
    )).then(response => {
      expect(response.status).to.eq(202)
      // expect(response.body[0].errorMsg).eq("This account is already configured/onboarded.")
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Onboard bitbucket repositories to a project', () => {
    onboardReposThroughProject({
      envs: [{ name: store.envName, provider: "aws", botIds: [] }],
      repos: [
        { provider: "aws", url: getUrlByName('NAU_007'), name: getUrlByName('NAU_007').replace('https://bitbucket.org/tenb-qa/','')+"-${store.envName.toLowerCase()}", engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", autoRemediate: "none", source: getUrlByName('NAU_007').replace('https://bitbucket.org/','') },
        { provider: "aws", url: getUrlByName('NAU_008'), name: getUrlByName('NAU_008').replace('https://bitbucket.org/tenb-qa/','')+"-${store.envName.toLowerCase()}", engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", autoRemediate: "none", source: getUrlByName('NAU_008').replace('https://bitbucket.org/','') }]
    })

    cy.get('@envDetails').then((response) => {
      store.envID = response[0]
      store.repoIDs = response[1]
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Connect AWS cloud account to a project', () => {
    cy.request(updateEnv(
      {
        "id": store.envID, "cloudAccountID": { [Cypress.env('cloudAccountIDs').aws_536274239938]: { vpcId: Cypress.env("awsVPCID"), region: Cypress.env("awsRegion") } }
      }
    )).then(response => {
      expect(response.status).to.eq(204)
    })
  })


  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Trigger IaC Scan', () => {
    cy.request(doIaCScan(store.envID)).then(response => {
      expect(response.status).to.eq(202)
    }).then(waitForReposToBeScanned => {
      waitForRepoStatusReady(store.repoIDs[0])
      waitForRepoStatusReady(store.repoIDs[1])
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Verify project scan considers all associated repos', () => {
    cy.request(getRepoStatsByID(store.repoIDs[0])).then(response => {
      expect(response.body.scans).to.be.above(0)
    })
    cy.request(getRepoStatsByID(store.repoIDs[1])).then(response => {
      expect(response.body.scans).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Verify compliant status policies', () => {
    getProjectCloudProvider(store.envID)
    cy.get('@cProvider').then((cloudProvider) => {
      let queryString = `offset=0&limit=10&provider=${cloudProvider}&ruleStatus=COMPLIANT&environmentId=${store.envID}`
      verifyCompliantPoliciesStat(queryString)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Run cloud scan and wait until it finishes', () => {
    cy.request(createCloudScanProfile(store.envID, { is_default: false, name: store.envName, options: { resource_types: Cypress.env("awsCloudResourcesToBeScannedWithProfile"), "vm_assess_opts": [] } }))
      .then(response => {
        store.csProfileID = response.body.profile_id
      }).then(runCloudScan => {
        // Run cloud scan
        cy.request(doCloudScanThroughProfile(store.envID, store.csProfileID)).then(response => {
          expect(response.status).to.eq(202)
          waitForCloudScanToFinish(store.envID, store.envName)
          cy.request(getCloudScanStatus(store.envID)).then((csResponse) => {
            expect(csResponse.body[0].cloud_scan_summary.scan_status).to.be.oneOf(["Successful", "Completed with errors"])
          })
        })
      })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Validate Violations', () => {
    letsWait(`Wait for CMDB to compile results for ${store.envID}`, _fifteenSeconds)
    verifyViolations(store.envID)
  })

  /**--------------------------------------------------------
 * Added by: Spat
 * Test Management ID:
---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Validate Drifts', () => {
    letsWait(`Wait for CMDB to compile results for ${store.envID}`, _fifteenSeconds)
    verifyDrifts(store.envID)
  })

  /**--------------------------------------------------------
  * Added by: Spat
  * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Create BitBucket PR with reviewer', () => {
    if (!store.onpremise) {
      // letsWait(`Wait for CMDB to compile results for ${store.envID}`, _fifteenSeconds)
      createPR(
        store.envID,
        'Bitbucket',
        Cypress.env('createAWSPullRequestDetails').resourceType,
        Cypress.env('createAWSPullRequestDetails').resourceName,
        Cypress.env('createAWSPullRequestDetails').violationName,
        getUrlByName("NAU_007").replace('https://bitbucket.org/','').replace('.git',''),
        Cypress.env('createAWSPullRequestDetails').iacFile,
        Cypress.env('createAWSPullRequestDetails').bitbucketReviewerName
      )
    }
    else {
      cy.log('Skipping as onprem..')
    }
  })

  /**--------------------------------------------------------
  * Added by: Spat
  * Test Management ID:
  ---------------------------------------------------------*/
  it('AWS - Create BitBucket PR without reviewer', () => {
    if (!store.onpremise) {
      // letsWait(`Wait for CMDB to compile results for ${store.envID}`, _fifteenSeconds)
      createPR(
        store.envID,
        'Bitbucket',
        Cypress.env('createAWSPullRequestDetails').resourceType,
        Cypress.env('createAWSPullRequestDetails').resourceName,
        Cypress.env('createAWSPullRequestDetails').violationName,
        getUrlByName("NAU_007").replace('https://bitbucket.org/','').replace('.git', ''),
        Cypress.env('createAWSPullRequestDetails').iacFile)
    }
    else {
      cy.log('Skipping as onprem..')
    }
  })

  /**--------------------------------------------------------
  * Added by: Spat
  * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Create Github PR with reviewer (HACKY: creating Github PR through Bitbucket IaC env)', () => {
    if (!store.onpremise) {
      // letsWait(`Wait for CMDB to compile results for ${store.envID}`, _fifteenSeconds)
      createPR(
        store.envID,
        'Github',
        Cypress.env('createAWSPullRequestDetails').resourceType,
        Cypress.env('createAWSPullRequestDetails').resourceName,
        Cypress.env('createAWSPullRequestDetails').violationName,
        getUrlByName("NAU_007").replace('https://bitbucket.org/','').replace('.git',''),
        Cypress.env('createAWSPullRequestDetails').iacFile,
        Cypress.env('createAWSPullRequestDetails').githubReviewerName)
    }
    else {
      cy.log('Skipping as onprem..')
    }
  })

  /**--------------------------------------------------------
  * Added by: Spat
  * Test Management ID:
  ---------------------------------------------------------*/
  it('AWS - Create Github PR without reviewer (HACKY: creating Github PR through Bitbucket IaC env)', () => {
    if (!store.onpremise) {
      // letsWait(`Wait for CMDB to compile results for ${store.envID}`, _fifteenSeconds)
      createPR(
        store.envID,
        'Github',
        Cypress.env('createAWSPullRequestDetails').resourceType,
        Cypress.env('createAWSPullRequestDetails').resourceName,
        Cypress.env('createAWSPullRequestDetails').violationName,
        getUrlByName("NAU_007").replace('https://bitbucket.org/','').replace('.git',''),
        Cypress.env('createAWSPullRequestDetails').iacFile)
    }
    else {
      cy.log('Skipping as onprem..')
    }
  })

  /**--------------------------------------------------------
  * Added by: Spat
  * Test Management ID:
  ---------------------------------------------------------*/
  // Skipping this because of APE-8634: gitlab refresh token expiry issue
  it.skip('AWS - Create Gitlab PR with reviewer (HACKY: creating Gitlab PR through Bitbucket IaC env)', () => {
    if (!store.onpremise) {
      // letsWait(`Wait for CMDB to compile results for ${store.envID}`, _fifteenSeconds)
      createPR(
        store.envID,
        'Gitlab',
        Cypress.env('createAWSPullRequestDetails').resourceType,
        Cypress.env('createAWSPullRequestDetails').resourceName,
        Cypress.env('createAWSPullRequestDetails').violationName,
        getUrlByName("NAU_007").replace('https://bitbucket.org/','').replace('.git',''),
        Cypress.env('createAWSPullRequestDetails').iacFile),
        Cypress.env('createAWSPullRequestDetails').gitlabReviewerName
    }
    else {
      cy.log('Skipping as onprem..')
    }
  })

  /**--------------------------------------------------------
  * Added by: Spat
  * Test Management ID:
  ---------------------------------------------------------*/
  // Skipping this because of APE-8634: gitlab refresh token expiry issue
  it.skip('AWS - Create Gitlab PR without reviewer (HACKY: creating Gitlab PR through Bitbucket IaC env)', () => {
    if (!store.onpremise) {
      // letsWait(`Wait for CMDB to compile results for ${store.envID}`, _fifteenSeconds)
      createPR(
        store.envID,
        'Gitlab',
        Cypress.env('createAWSPullRequestDetails').resourceType,
        Cypress.env('createAWSPullRequestDetails').resourceName,
        Cypress.env('createAWSPullRequestDetails').violationName,
        getUrlByName("NAU_007").replace('https://bitbucket.org/','').replace('.git',''),
        Cypress.env('createAWSPullRequestDetails').iacFile)
    }
    else {
      cy.log('Skipping as onprem..')
    }
  })

  /**--------------------------------------------------------
  * Added by: Spat
  * Test Management ID:
  ---------------------------------------------------------*/
  it('AWS - DEMO - MUST - Create ADO PR without reviewer (HACKY: creating ADO PR through Bitbucket IaC env)', () => {
    if (!store.onpremise) {
      // letsWait(`Wait for CMDB to compile results for ${store.envID}`, _fifteenSeconds)
      createPR(
        store.envID,
        'Microsoft',
        Cypress.env('createAWSPullRequestDetails').resourceType,
        Cypress.env('createAWSPullRequestDetails').resourceName,
        Cypress.env('createAWSPullRequestDetails').violationName,
        'org-qe-org1/5cecc9cc-18b9-45dc-b72b-1c3539327d59',
        Cypress.env('createAWSPullRequestDetails').iacFile)
    }
    else {
      cy.log('Skipping as onprem..')
    }
  })

  /**--------------------------------------------------------
   * Added by: Nitesh
   * Test Management ID:
   ---------------------------------------------------------*/
  it('AWS - Validate resource counts for billing tenant', () => {
    cy.request(getResourceCountForBillingTenant()).then((response) => {
      expect(response.status).to.eq(200)
      //Validate IaC resources returned in metering API
      expect(response.body[0].iac.find(resTypes => resTypes.type === "aws_security_group").count).to.be.above(0)
      //Validate IaC resources returned in metering API
      expect(response.body[0].cloud.find(resTypes => resTypes.type === "aws_subnet").count).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Sabith
   * Test Management ID:
  ---------------------------------------------------------*/
  it('Should not be able to delete a repo. associated to a project', () => {
    cy.request(deleteRepo(store.repoIDs[0])).then(response => {
      expect(response.body.code).to.equal(412)
      expect(response.body.type).to.equal("REPO_REFERENCED_IN_PROJEC")
    })
  })

  /**--------------------------------------------------------
    * Added by: rthareja
    * Test Management ID: 
  ---------------------------------------------------------*/
  it('MUST - Check if global repos are paginated', () => {
    cy.request(getRepos()).then(response => {
      expect(response.status).to.eq(200);
      store.count = response.body.count;
      const limit = 10; // to be set by the user
      store.limit = limit;
    })
    .then(getDetailsOfFirstPage => {
      const queryString = `offset=0&limit=${store.limit}`;
      cy.request(getReposInPaginatedForm(queryString)).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body.repos.length).to.eq(response.body.limit)
      })
    })
    .then(getDetailsOfRandomPage => {
      let randomNumberGenerated = generateRandomNumber(store.count);
      store.totalCount = randomNumberGenerated;
      getPageOffset(store)
      const queryString = `offset=${store.offset}&limit=${store.limit}`;
      cy.request(getReposInPaginatedForm(queryString)).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body.repos.length).to.eq(response.body.limit)
      })
    })
    .then(getDetailsOfLastPage => {
      store.totalCount = store.count;
      getPageOffset(store);
      const queryString = `offset=${store.offset}&limit=${store.limit}`;
      cy.request(getReposInPaginatedForm(queryString)).then(response => {
        expect(response.status).to.eq(200);
        expect(response.body.repos.length).to.eq(response.body.limit)
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - AWS - Validate cancelling a cloud scan works fine', () => {
    cy.request(createCloudScanProfile(store.envID, { is_default: false, name: store.envName + '-to-cancel-scan', options: { resource_types: Cypress.env("awsCloudResourcesToBeScannedWithProfile"), "vm_assess_opts": [] } }))
      .then(response => {
        store.csProfileID = response.body.profile_id
      })
      .then(runCloudScan => {
        cy.request(doCloudScanThroughProfile(store.envID, store.csProfileID))
          .then(response => {
            expect(response.status).to.eq(202)
            letsWait(`Wait for sometime for scan to start`, _threeSeconds)
            cy.request(cancelCloudScanByGroupId(response.body.id)).then(response => {
              expect(response.status).to.eq(202)
            })
              .then(verifyScanIsCancelled => {
                waitForCloudScanToFinish(store.envID, store.envName)
                cy.request(getCloudScanStatus(store.envID)).then((csResponse) => {
                  expect(csResponse.body[0].cloud_scan_summary.scan_status).to.eq("Cancelled")
                })
              })
          })
      })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - AWS - Validate helm kubescan for k8s cluster is downloaded and contents are present in it', ()=>{
    let path = Cypress.config().downloadsFolder
    let file = '/helm.zip'
    cy.request(getHelmKubescanForProject({"env":store.envID,"target":Cypress.config().baseUrl.replace('/apiHandle', ''),"clusterUUID":store.clusterUUID,"clusterName":"acqa-test-eks-cluster1"}))
    .then((response) =>{
      cy.writeFile(path+file, response.body, 'binary')
    })
    .then((unzipDownloadedFile)=>{
      cy.task('unzipping', { path, file })
    })
    .then((validateUnzipFilesContents)=>{
      cy.readFile(path+ getUrlByName('NAU_006'))
      .then((response)=>{
          expect(response.target).to.not.empty
          expect(response.app).to.not.empty
      })
    })
  })




})