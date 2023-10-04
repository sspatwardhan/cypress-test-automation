import { getProjects, ignoreUnIgnoreIaCResourceMisconfiguration, ignoreMisconfigurations } from '../../../requests/projects'
import { getRepoIdsForProject,onboardRepoToProject, waitForRepoStatusReady, getGlobalResourcesData } from '../../../requests/repositoriesAndResources'
import { initAPISpecRoutine, _tenSeconds, _sixtySeconds, _fifteenSeconds, _twentySeconds, letsWait, getSpecBasedNamePrefix, _fourtySeconds, _fiveSeconds } from '../../../support/utils'
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper';

const store = {
  envName: `${getSpecBasedNamePrefix() + Date.now()}`,
}

describe('Resource Misconfigurations - Ignore/Unignore', () => {
  before(() => initAPISpecRoutine('before'))
  after(()=> initAPISpecRoutine('after'))

  //--------------------- Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Onboard github repository to a project', () => {
    cy.request(onboardRepoToProject({
      envs:[{name:store.envName,provider:"aws",botIds:[]}],
      repos:[
        { provider:"aws",url:getUrlByName("NAU_012"),name:getUrlByName('NAU_012').replace('https://bitbucket.org/tenb-qa/','')+`-${store.envName.toLowerCase()}`,engineType:"terraform",config:[{key:"TERRAFORM_VERSION",value:Cypress.env("tf_version_for_aws_repos")},{key:"TERRASCAN",value:"false"}],folderPath:"/",autoRemediate:"none",source:getUrlByName('NAU_012').replace('tenb-qa/','')}]
    })).then(response => {
      expect(response.status).to.eq(202)
      expect(response.body[0].id).to.not.be.empty
      store.envID = response.body[0].id
    })
  })



  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Wait for automatic IaC scan to complete', () => {
    letsWait("wait for the project to soak...", _fourtySeconds)
    // Store Repo IDs
    cy.request(getRepoIdsForProject(store.envID)).then(response => {
      store.repoIDs = response.body.repoIds
    })
    .then(waitForReposToBeScanned => {
      waitForRepoStatusReady(store.repoIDs[0])
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Validate target resource misconfig metadata', () => {
    // Validate statistics
    cy.request(getGlobalResourcesData(`environmentId=${store.envID}&useBaseline=true&limit=20&offset=0&type=aws_ami&hasIac=true`))
    .then(resResponse => {
      expect(resResponse.status).to.eq(200)
      // Impacted resources should be more than 50 (by the time this validation runs)
      expect(resResponse.body.count).to.above(50)
      //store resource count for later use
      store.totalIaCResourceCount = resResponse.body.count
      // Store the violationSlug.
      store.targetViolationSlug = resResponse.body.resources[0].violations[0].violation.violationSlug
      // Store the accuricsIds
      store.targetAccuricsIds = []
      // Get any 20 resources to ignore
      for(var r=30; r==50; r++){
        store.targetAccuricsIds.push(resResponse.body.resources[r].accuricsId)  
      }
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Ignore multiple resources in misconfiguration', () => {
    cy.request(ignoreUnIgnoreIaCResourceMisconfiguration(store.envID, store.targetViolationSlug,
      // { ignore:true, reason:store.envID,category:'Applicable Risk',accuricsIds:[`${store.targetAccuricsId}`],expiresAfter:null}))
      { ignore:true, reason:store.envID,category:'Applicable Risk',accuricsIds: store.targetAccuricsIds ,expiresAfter:null}))
    .then(response => {
      expect(response.status).to.eq(200)
    })
    .then(validateIgnoredMisconfigurations => {
      letsWait("wait for ignored misconfigs go through...", _tenSeconds)
      cy.request(getProjects()).then(resResponse => {
        expect(resResponse.status).to.eq(200)
        // Validate violation count
        const project = resResponse.body.projects.find(p => p.environmentID === store.envID)
        expect(project.policyViolations).to.eq(1)
      })
    })
    .then(validateImpactedResourceCount => {
      cy.request(getGlobalResourcesData(`environmentId=${store.envID}&ruleName=amiNotEncrypted`)).then(resResponse => {
        expect(resResponse.status).to.eq(200)
        expect(resResponse.body.count).to.eq(store.totalIaCResourceCount - store.targetAccuricsIds.length)
      })
    })
  })


  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Unignore multiple (ignored earlier) resources in misconfiguration', () => {
    cy.request(ignoreUnIgnoreIaCResourceMisconfiguration(store.envID, store.targetViolationSlug,
      { ignore:false,accuricsIds:store.targetAccuricsIds }))
    .then(response => {
      expect(response.status).to.eq(200)
    }).then(validateIgnoredMisconfigurations => {
      cy.request(getProjects()).then(resResponse => {
        expect(resResponse.status).to.eq(200)
        //Validate violation count
        const project = resResponse.body.projects.find(p => p.environmentID === store.envID)
        expect(project.policyViolations).to.eq(1)
      })
    })
    // Impacted resources count should now be restored to total
    cy.request(getGlobalResourcesData(`environmentId=${store.envID}&ruleName=amiNotEncrypted`)).then(resResponse => {
      expect(resResponse.status).to.eq(200)
      expect(resResponse.body.count).to.eq(store.totalIaCResourceCount)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Validate Ignore all resources in misconfigurations', () => {
    cy.request(ignoreMisconfigurations({
      category: "Applicable Risk",
      expiresAfter: 15552000,   // 6 months
      ignore: true,
      policyID: store.targetViolationSlug,
      reason: "BAT API - Testing ignore all",
      selectAll: true
    }))
    .then(validateImpactedResourceCount => {
      letsWait("Wait for all violations to get ignored", _fiveSeconds)
      cy.request(getGlobalResourcesData(`environmentId=${store.envID}&hasViolation=true&showIgnored=true&limit=${store.totalIaCResourceCount + 10}&ruleName=amiNotEncrypted`)).then(resResponse => {
        expect(resResponse.status).to.eq(200)
        expect(resResponse.body.count).to.eq(store.totalIaCResourceCount)
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Validate Unignore all resources in misconfigurations', () => {
    cy.request(ignoreMisconfigurations({
      category: "Applicable Risk",
      expiresAfter: 15552000,   // 6 months
      ignore: false,
      policyID: store.targetViolationSlug,
      reason: "BAT API - Testing ignore all",
      selectAll: true
    }))
    .then(validateImpactedResourceCount => {
      letsWait("Wait for all violations to get ignored",_fiveSeconds)
      cy.request(getGlobalResourcesData(`environmentId=${store.envID}&hasViolation=true&showIgnored=true&limit=1500&ruleName=amiNotEncrypted`)).then(resResponse => {
        expect(resResponse.status).to.eq(200)
        expect(resResponse.body.count).to.eq(0)
      })
    })
  })


})