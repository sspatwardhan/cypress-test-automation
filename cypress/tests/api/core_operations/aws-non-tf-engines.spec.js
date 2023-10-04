import { doIaCScan } from '../../../requests/projects'
import { onboardReposThroughProject, waitForRepoStatusReady, getGlobalResourcesData } from '../../../requests/repositoriesAndResources'
import { initAPISpecRoutine, letsWait, getSpecBasedNamePrefix, _tenSeconds } from '../../../support/utils'
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper';


const store = {
  cftEnvName: `${getSpecBasedNamePrefix()+ 'cft-' + Date.now()}`,
  codeCommitEnvName: `${getSpecBasedNamePrefix()+ 'cc-' + Date.now()}`
}

describe('Core Operations - AWS - CloudFormation', () => {
  before(() => initAPISpecRoutine('before'))
  after(()=> initAPISpecRoutine('after'))

  //--------------------- CFT Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Onboard a CFT repository to project', () => {
    onboardReposThroughProject({
      envs: [{ name: store.cftEnvName, provider: "aws", botIds: [] }],
      repos: [
        { provider: "aws", url: getUrlByName('NAU_011'), name: getUrlByName('NAU_011').replace('https://bitbucket.org/tenb-qa/','')+`${store.cftEnvName.toLowerCase()}`, engineType: "cft", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", autoRemediate: "none", source: getUrlByName('NAU_011').replace('https://bitbucket.org/','') }
      ]
    })

    cy.get('@envDetails').then((response) => {
      store.cftEnvID = response[0]
      store.cftRepoIDs = response[1]
    })
  })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Trigger CFT IaC Scan', () => {
    cy.request(doIaCScan(store.cftEnvID)).then(response => {
      expect(response.status).to.eq(202)
    }).then(waitForReposToBeScanned => {
      waitForRepoStatusReady(store.cftRepoIDs[0])
    })
  })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('DEMO - MUST - AWS - validates CFT scan results', () => {
      letsWait("Waiting for CMDB to compile results...", _tenSeconds)
      //Validate statistics
      cy.request(getGlobalResourcesData(`environmentId=${store.cftEnvID}&hasIac=true&hasCloud=true`)).then(resResponse => {
        expect(resResponse.status).to.eq(200)
        //Validate resources
        expect(resResponse.body.count).to.be.above(0)
      })
    })


//--------------------- CodeCommit Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Onboard AWS-CodeCommit repository to project', () => {
    onboardReposThroughProject({
      envs: [{ name: store.codeCommitEnvName, provider: "aws", botIds: [] }],
      repos: [
        { provider: "aws", url: "codecommit::ca-central-1://acqa-repo14-aws-quick-deploy-with-tfstate", name: `acqa-repo14-aws-quick-deploy-with-tfstate_${store.cftEnvName.toLowerCase()}`, engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "true" }], folderPath: "/", autoRemediate: "none", source: "ca-central-1/acqa-repo14-aws-quick-deploy-with-tfstate" }
      ]
    })

    cy.get('@envDetails').then((response) => {
      store.codeCommitEnvID = response[0]
      store.codeCommitRepoIDs = response[1]
    })

  })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
  it('DEMO - MUST - AWS - Trigger AWS-CodeCommit IaC Scan', () => {
    cy.request(doIaCScan(store.codeCommitEnvID)).then(response => {
      expect(response.status).to.eq(202)
    }).then(waitForReposToBeScanned => {
      waitForRepoStatusReady(store.codeCommitRepoIDs[0])
    })
  })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('DEMO - MUST - AWS - validates the AWS-CodeCommit scan results', () => {
      letsWait("Waiting for CMDB to compile results...", _tenSeconds)
      //Validate statistics
      cy.request(getGlobalResourcesData(`environmentId=${store.codeCommitEnvID}&hasIac=true&hasCloud=true`)).then(resResponse => {
        expect(resResponse.status).to.eq(200)
        //Validate resources
        expect(resResponse.body.count).to.be.above(0)
      })
    })








})