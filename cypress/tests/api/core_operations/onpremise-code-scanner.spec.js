import { cleanSlate, doIaCScan, getProjectPRs, updateEnv, createPR } from '../../../requests/projects'
import { getGlobalResourcesData, getRepoIdsForProject, onboardRepoToProject, waitForRepoStatusReady } from '../../../requests/repositoriesAndResources'
// import { getPolicyGroups } from '../../../requests/policy-groups-and-policies'
import { initAPISpecRoutine, _fourtySeconds, _tenSeconds, _twentySeconds, letsWait, getSpecBasedNamePrefix } from '../../../support/utils'
import { getReposForBot, waitForBotStatus } from '../../../requests/integrations'

const store = {
  // envName: `${getSpecBasedNamePrefix() + Date.now()}`,
  // cftEnvName: `${getSpecBasedNamePrefix() + "CFT-" + Date.now()}`,
  // cloudAccountDisplayName: `cloud_account_${new Date().getTime()}`
}

describe('Onpremise Code Scanner', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - AWS:TF - onboard enterprise repository with deep scan, auto-remediation to a project', () => {
    cy.request(onboardRepoToProject({
      envs: [{ name: getSpecBasedNamePrefix() + "aws-" + Date.now(), provider: "aws", botIds: [Cypress.env('botID')] }],
      repos: [
        { provider: "aws", url: `https://tcs-megatron.westus2.cloudapp.azure.com/engineering/acqa-repo1-aws-tf12-part1.git`, name: `acqa-repo1-aws-tf12-part1.git_${new Date().getTime()}`, engineType: "terraform", config: [{ key: "ON_PREM", value: "true" }, { key: "REPO_TYPE", value: "github" }, { key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", autoRemediate: "auto-remediate", source: `engineering/acqa-repo1-aws-tf12-part1.git` },
        { provider: "aws", url: `https://tcs-megatron.westus2.cloudapp.azure.com/engineering/acqa-repo1-aws-tf12-part2.git`, name: `acqa-repo1-aws-tf12-part2.git_${new Date().getTime()}`, engineType: "terraform", config: [{ key: "ON_PREM", value: "true" }, { key: "REPO_TYPE", value: "github" }, { key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", autoRemediate: "auto-remediate", source: `engineering/acqa-repo1-aws-tf12-part2.git` }
      ]
    })).then(response => {
      expect(response.status).to.eq(202)
      expect(response.body[0].id).to.not.be.empty
      store.awsEnvID = response.body[0].id
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - AWS:TF - Connect AWS cloud account to a project', () => {
    cy.request(updateEnv(
      {
        "id": store.awsEnvID, "cloudAccountID": { [Cypress.env('cloudAccountIDs').aws_536274239938]: { vpcId: Cypress.env("awsVPCID"), region: Cypress.env("awsRegion") } }
      }
    )).then(response => {
      expect(response.status).to.eq(204)
    })
  })


  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - AWS:TF - Trigger IaC Scan and check whether bot is processing', () => {
    letsWait("wait for the project to soak...", _tenSeconds)
    // Store Repo IDs
    cy.request(getRepoIdsForProject(store.awsEnvID)).then(response => {
      expect(response.body.repoIds.length).to.eq(2)
      store.repoIDs = response.body.repoIds
    })
      .then(scanProject => {
        cy.request(doIaCScan(store.awsEnvID)).then(response => {
          expect(response.status).to.eq(202)
        }).then(waitForReposToBeScanned => {
          waitForBotStatus(Cypress.env('botID'), "BOT_PROCESSING_JOB")
          waitForRepoStatusReady(store.repoIDs[0])
          waitForRepoStatusReady(store.repoIDs[1])
        })
      })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - AWS: Validate manual PR creation', () => {
    createPR(
      store.awsEnvID,
      'githubenterprise',
      Cypress.env('createAWSPullRequestDetails').resourceType,
      Cypress.env('createAWSPullRequestDetails').resourceName,
      Cypress.env('createAWSPullRequestDetails').violationName,
      'engineering/' + Cypress.env('bitbucketBATRepo1aws'),
      Cypress.env('createAWSPullRequestDetails').iacFile)

    letsWait("Waiting for PR to be generated...", _fourtySeconds)
    // Verify pull request
    cy.request(getProjectPRs(store.awsEnvID, 10)).then(response => {
      expect(response.body.pullRequests.find(repo => repo.title === `BAT-PR-${store.awsEnvID}`).title).to.include(`BAT-PR-${store.awsEnvID}`)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - AWS:TF - validate scan results, and pull request', () => {
    letsWait("Waiting for CMDB to compile results...", _twentySeconds)
    //Validate statistics
    cy.request(getGlobalResourcesData(`environmentId=${store.awsEnvID}&hasIac=true&hasCloud=true`)).then(resResponse => {
      expect(resResponse.status).to.eq(200)
      //Validate resources
      expect(resResponse.body.count).to.be.above(20)
    })
    letsWait("Waiting for PR to be generated...", _fourtySeconds)
    // Verify pull request
    cy.request(getProjectPRs(store.awsEnvID, 10)).then(response => {
      expect(response.body.pullRequests.find(repo => repo.repository === "engineering/acqa-repo1-aws-tf12-part1").repository).to.include("engineering/acqa-repo1-aws-tf12-part1")
      expect(response.body.pullRequests.find(repo => repo.repository === "engineering/acqa-repo1-aws-tf12-part2").repository).to.include("engineering/acqa-repo1-aws-tf12-part2")
    })
  })

  // ------------------------ CFT -----------------------------
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - AWS - onboard gitlab enterprise CFT repository with linear scan to a project', () => {
    cy.request(onboardRepoToProject({
      envs: [{ name: getSpecBasedNamePrefix() + "cft-" + Date.now(), provider: "aws", botIds: [Cypress.env('botID')] }],
      repos: [
        {
          provider: "aws", url: "https://tcs-megatron.westus2.cloudapp.azure.com/engineering/acqa-repo6-aws-cft.git", name: `repo6-bot.git_${new Date().getTime()}`, engineType: "cft",
          config: [{ key: "USE_TERRASCAN", value: "true" }, { key: "ON_PREM", value: "true" }, { key: "REPO_TYPE", value: "github" }, { key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "true" }], folderPath: "/", autoRemediate: "none", source: `unused/15`
        }]
    })).then(response => {
      expect(response.status).to.eq(202)
      expect(response.body[0].id).to.not.be.empty
      store.botCFTEnvID = response.body[0].id
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - AWS - Trigger cft IaC Scan and check whether bot is processing', () => {
    letsWait("wait for the project to soak...", _tenSeconds)
    // Store Repo IDs
    cy.request(getRepoIdsForProject(store.botCFTEnvID)).then(response => {
      store.repoIDs = response.body.repoIds
    })
      .then(scanProject => {
        cy.request(doIaCScan(store.botCFTEnvID)).then(response => {
          expect(response.status).to.eq(202)
        }).then(waitForReposToBeScanned => {
          // waitForBotStatus(Cypress.env('botID'), "BOT_PROCESSING_JOB")
          waitForRepoStatusReady(store.repoIDs[0])
        })
      })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - AWS - validate cft scan results', () => {
    letsWait("Waiting for CMDB to compile results...", _twentySeconds)
    //Validate Statistics
    cy.request(getGlobalResourcesData(`environmentId=${store.botCFTEnvID}&hasIac=true`)).then(resResponse => {
      expect(resResponse.status).to.eq(200)
      //Validate resources
      expect(resResponse.body.count).to.be.above(0)
    })
  })


  // ------------------------ K8s -----------------------------
  it('ONPREM-SCANNER - AWS - onboard bitbucket enterprise k8s repository with linear scan to a project', () => {
    cy.request(onboardRepoToProject({
      envs: [{ name: getSpecBasedNamePrefix() + "k8s-" + Date.now(), provider: "aws", botIds: [Cypress.env('botID')] }],
      repos: [
        {
          provider: "aws", url: "https://tcs-bumblebee.westus2.cloudapp.azure.com/scm/eng/k8s-sample-app.git", name: `k8s-bot.git_${new Date().getTime()}`, engineType: "terraform",
          config: [{ key: "ON_PREM", value: "true" }, { key: "REPO_TYPE", value: "bitbucket-server" }, { key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "true" }], folderPath: "/", autoRemediate: "none", source: `ENG/k8s-sample-app.git`
        }]
    })).then(response => {
      expect(response.status).to.eq(202)
      expect(response.body[0].id).to.not.be.empty
      store.botK8sEnvID = response.body[0].id
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - AWS - Trigger k8s IaC Scan and check whether bot is processing', () => {
    letsWait("wait for the project to soak...", _tenSeconds)
    // Store Repo IDs
    cy.request(getRepoIdsForProject(store.botK8sEnvID)).then(response => {
      store.repoIDs = response.body.repoIds
    })
      .then(scanProject => {
        cy.request(doIaCScan(store.botK8sEnvID)).then(response => {
          expect(response.status).to.eq(202)
        }).then(waitForReposToBeScanned => {
          // waitForBotStatus(Cypress.env('botID'), "BOT_PROCESSING_JOB")
          waitForRepoStatusReady(store.repoIDs[0])
        })
      })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - AWS - validate k8s scan results', () => {
    letsWait("Waiting for CMDB to compile results...", _twentySeconds)
    //Validate Statistics
    cy.request(getGlobalResourcesData(`environmentId=${store.botK8sEnvID}&hasIac=true`)).then(resResponse => {
      expect(resResponse.status).to.eq(200)
      //Validate resources
      expect(resResponse.body.count).to.be.above(0)
    })
  })


  //----------------------- AZURE Tests -----------------
  it('ONPREM-SCANNER -  Azure - create project with github/gitlab enterprise repositories with linear scan and auto-remediation', () => {
    cy.request(onboardRepoToProject({
      envs: [{ name: getSpecBasedNamePrefix() + "az-" + Date.now(), provider: "azure", botIds: [Cypress.env('botID')] }],
      repos: [
        { provider: "azure", url: `https://tcs-megatron.westus2.cloudapp.azure.com/engineering/acqa-repo9-azure-tf12.git`, name: `acqa-repo9-azure-tf12.git_${new Date().getTime()}`, engineType: "terraform", config: [{ key: "ON_PREM", value: "true" }, { key: "REPO_TYPE", value: "github" }, { key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "true" }], folderPath: "/", autoRemediate: "auto-remediate", source: `engineering/acqa-repo9-azure-tf12.git` },
        { provider: "azure", url: `https://tcs-megatron.westus2.cloudapp.azure.com/engineering/terragoat.git`, name: `terragoat.git_${new Date().getTime()}`, engineType: "terraform", config: [{ key: "ON_PREM", value: "true" }, { key: "REPO_TYPE", value: "github" }, { key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "true" }], folderPath: "/terraform/azure", autoRemediate: "auto-remediate", source: `engineering/terragoat.git` }
      ]
    })).then(response => {
      expect(response.status).to.eq(202)
      expect(response.body[0].id).to.not.be.empty
      store.azEnvID = response.body[0].id
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - Azure - Trigger IaC Scan and check whether bot is processing', () => {
    letsWait("wait for the project to soak...", _tenSeconds)
    // Store Repo IDs
    cy.request(getRepoIdsForProject(store.azEnvID)).then(response => {
      expect(response.body.repoIds.length).to.eq(2)
      store.repoIDs = response.body.repoIds
    })
      .then(scanProject => {
        cy.request(doIaCScan(store.azEnvID)).then(response => {
          expect(response.status).to.eq(202)
        }).then(waitForReposToBeScanned => {
          // waitForBotStatus(Cypress.env('botID'), "BOT_PROCESSING_JOB")
          waitForRepoStatusReady(store.repoIDs[0])
          waitForRepoStatusReady(store.repoIDs[1])
        })
      })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - Azure - validate scan results, and pull request', () => {
    letsWait("Waiting for CMDB to compile results...", _twentySeconds)
    //Validate statistics
    cy.request(getGlobalResourcesData(`environmentId=${store.azEnvID}&hasIac=true&hasCloud=true`)).then(resResponse => {
      expect(resResponse.status).to.eq(200)
      //Validate resources
      expect(resResponse.body.count).to.be.above(90)
    })
    letsWait("Waiting for PR to be generated...", _fourtySeconds)
    // Verify pull request
    cy.request(getProjectPRs(store.azEnvID, 10)).then(response => {
      //Github
      expect(response.body.pullRequests.find(repo => repo.repository === "engineering/acqa-repo9-azure-tf12").repository).to.include("engineering/acqa-repo9-azure-tf12")
      expect(response.body.pullRequests.find(repo => repo.repository === "engineering/terragoat").repository).to.include("engineering/terragoat")
    })
  })

  // ------------------ Generic tests  ------------------ 
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   ---------------------------------------------------------*/
  it('ONPREM-SCANNER - List Gitlab enterprise repos for a bot', () => {
    cy.request(getReposForBot('gitlabenterprise', Cypress.env('botID'))).then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(1)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('ONPREM-SCANNER - List Github enterprise repos for a bot', () => {
    cy.request(getReposForBot('githubenterprise', Cypress.env('botID'))).then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(1)
    })
  })

  /**--------------------------------------------------------
 * Added by: Spat
 * Test Management ID:
---------------------------------------------------------*/
  it('ONPREM-SCANNER - List Bitbucket server repos for a bot', () => {
    cy.request(getReposForBot('bitbucketserver', Cypress.env('botID'))).then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(1)
    })
  })





})
