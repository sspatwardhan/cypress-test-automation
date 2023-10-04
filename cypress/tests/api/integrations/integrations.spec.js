import {
  changeOnpremiseBotNameDescription, addOnpremiseBOT, deleteOnpremiseBOT, getBOTStatusAllBots,
  getApiTokens, createAPIAuthToken, escalateMessage, createAlert, getScmIntegrationStatus, deleteApiToken
} from '../../../requests/integrations';
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper';
import { createProjectWithDefaultPolicies } from '../../../requests/projects';
import { initAPISpecRoutine, validateURL, getSpecBasedNamePrefix } from '../../../support/utils'
import { getCloudProviderDefaultPolicyID } from '../../../requests/policy-groups-and-policies'
import { downloadAndVerifyAllCLIs, downloadBot } from '../../../requests/cli_and_downloads'
import { getScanRuns, getRepoContentsForBranch, getRepoContentsDefaultBranch, getRepoBranches, getRepoReviewers, getReposBySCMType } from '../../../requests/repositoriesAndResources';
import { publicGetProjects } from '../../../requests/public-apis'
import { getPipelineSummary } from '../../../requests/cli_and_downloads'

const store = {
  adoRepoOrgAndRepoIDSlug: 'tcs-qe-org1/406e4af0-f57d-46fe-9e0d-6cad3229970f',
  envName: `${getSpecBasedNamePrefix() + Date.now()}`,
}

describe('Verify integrations', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))

  //--------------------- Tests start here ------------------------

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Get bitbucket SaaS repositories', () => {
    cy.request(getReposBySCMType('bitbucket'))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.data.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Verify bitbucket repository reviewers', () => {
    cy.request(getRepoReviewers('bitbucket', 'tenb-qa/' + Cypress.env("bitbucketBATRepo1aws")))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Verify bitbucket repository branches', () => {
    cy.request(getRepoBranches('bitbucket', 'tenb-qa/' + Cypress.env("bitbucketBATRepo1aws")))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Verify bitbucket repository contents', () => {
    cy.request(getRepoContentsDefaultBranch('bitbucket', 'tenb-qa/' + Cypress.env("bitbucketBATRepo1aws"), "/"))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   * Ticket ID: APE-7290 APE-7294 APE-7015
  ---------------------------------------------------------*/
  it('DEMO - MUST - Verify bitbucket repository and branch contents (repo: special-scenarios)', () => {
    cy.request(getRepoContentsDefaultBranch('bitbucket', 'tenb-qa/special-scenarios', "/"))
    .then((response) => {
      expect(response.status).to.eq(200)
      let fileDetails = response.body.find(file => file.type === "blob")
      expect(fileDetails.name).to.eq("master-branch-file1")
    })
    cy.request(getRepoContentsForBranch('bitbucket', 'tenb-qa/special-scenarios', "/", "branch3-with-a-%2F-in-name"))
    .then((response) => {
      expect(response.status).to.eq(200)
      let fileDetails = response.body.find(file => file.type === "blob")
      expect(fileDetails.name).to.eq("branch3-file1")

    })
  })


  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Get github SaaS repositories', () => {
    cy.request(getReposBySCMType('github'))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.data.length).to.be.above(0)
    })
  })


  /**--------------------------------------------------------
 * Added by: Spat
 * Test Management ID:
---------------------------------------------------------*/
  it('DEMO - MUST - Verify github repository branches', () => {
    cy.request(getRepoBranches('github', 'tenb-qa/' + Cypress.env("bitbucketBATRepo1aws")))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
     * Added by: Arti Singh
     * Test Management ID:
  ----------------------------------------------------------*/
  it('DEMO - MUST - Verify GitHub repository reviewers', () => {
    cy.request(getRepoReviewers('github', 'tenb-qa/' + Cypress.env("bitbucketBATRepo1aws")))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Verify github repository contents', () => {
    cy.request(getRepoContentsDefaultBranch('github', 'tenb-qa/' + Cypress.env("bitbucketBATRepo1aws"), "/"))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   * Ticket ID: APE-7290 APE-7294 APE-7015
  ---------------------------------------------------------*/
  it('DEMO - MUST - Verify github repository and branch contents (repo: special-scenarios)', () => {
    cy.request(getRepoContentsDefaultBranch('github', 'tenb-qa/special-scenarios', "/"))
    .then((response) => {
      expect(response.status).to.eq(200)
      let fileDetails = response.body.find(file => file.type === "blob")
      expect(fileDetails.name).to.eq("branch2-file1")
      let folderDetails = response.body.find(folder => folder.type === "tree")
      expect(folderDetails.name).to.eq("branch2-folder1")
    })
    cy.request(getRepoContentsForBranch('github', 'tenb-qa/special-scenarios', "/", "branch3-with-a-%2F-in-name"))
    .then((response) => {
      expect(response.status).to.eq(200)
      let fileDetails = response.body.find(file => file.type === "blob")
      expect(fileDetails.name).to.eq("branch3-file1")
    })
  })


  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  // Skipping this because of APE-8634: gitlab refresh token expiry issue
  it.skip('DEMO - MUST - Get gitlab SaaS repositories', () => {
    cy.request(getReposBySCMType('gitlab'))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.data.length).to.be.above(0)
    })
  })


  /**--------------------------------------------------------
  * Added by: Arti Singh
  * Test Management ID:
 ---------------------------------------------------------*/
  // TODO: There is currently no accurics endpoint available to fetch the group/project id from gitlab
  // Skipping this because of APE-8634: gitlab refresh token expiry issue
  it.skip('MUST - Verify GitLab repository reviewers', () => {
    cy.request(getRepoReviewers('gitlab', 'unused/30545295'))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti Singh
   * Test Management ID:
  ---------------------------------------------------------*/
  // this repo to https://github.com/AC10QA-ORG1
  // TODO: There is currently no accurics endpoint available to fetch the group/project id from gitlab
  // Skipping this because of APE-8634: gitlab refresh token expiry issue
  it.skip('MUST - Verify GitLab repository branches', () => {
    cy.request(getRepoBranches('gitlab', 'unused/30545295'))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  // this applies to Saurabh's gitlab - group:accurics project: acqa-repo1-aws-tf12-part1
  // TODO: There is currently no accurics endpoint available to fetch the group/project id from gitlab
  // Skipping this because of APE-8634: gitlab refresh token expiry issue
  it.skip('MUST - Verify GitLab repository contents', () => {
    cy.request(getRepoContentsDefaultBranch('gitlab', 'unused/30545295', "/"))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(0)
    })
  })

  // /**--------------------------------------------------------
  //  * Added by: Spat
  //  * Test Management ID:
  //  * UI IS NOT USING THIS AT PRESENT
  // ---------------------------------------------------------*/
  // it('MUST - Verify GitLab orgs and repos', () => {
  //   const targetSCM = 'gitlab'
  //   const targetOrgName = "AC10QA-ORG1"
  //   cy.request(getSCMOrgs(targetSCM)).then(orgResp => {
  //     expect(orgResp.status).to.eq(200)
  //     store.targetOrgID = orgResp.body.find(orgs => orgs.name === targetOrgName).id
  //   })
  //     .then(getOrgRepos => {
  //       cy.request(getReposBySCMOrgID(targetSCM, store.targetOrgID))
  //         .then(orgRepoResp => {
  //           expect(orgRepoResp.status).to.eq(200)
  //           expect(orgRepoResp.body.find(repos => repos.url === `https://${targetSCM}.com/${targetOrgName.toLowerCase()}/${Cypress.env('bitbucketBATRepo1aws')}.git`).type).to.eq(targetSCM.charAt(0).toUpperCase() + targetSCM.slice(1))
  //         })
  //     })
  // })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   * Ticket ID: APE-7290 APE-7294 APE-7015
  ---------------------------------------------------------*/
  // this applies to Saurabh's gitlab - group:AC10QA-ORG1 project: special-scenarios
  // TODO: There is currently no accurics endpoint available to fetch the group/project id from gitlab
  // Skipping this because of APE-8634: gitlab refresh token expiry issue
  it.skip('Verify GitLab repository and branch contents (repo: special-scenarios)', () => {
    cy.request(getRepoContentsDefaultBranch('gitlab', 'unused/34506974', "/"))
    .then((response) => {
      expect(response.status).to.eq(200)
      let fileDetails = response.body.find(file => file.type === "blob")
      expect(fileDetails.name).to.eq("branch2-file1")
      let folderDetails = response.body.find(folder => folder.type === "tree")
      expect(folderDetails.name).to.eq(" branch2-folder1")
    })
    cy.request(getRepoContentsForBranch('gitlab', 'unused/34506974', "/", "branch3-with-a-%2F-in-name"))
    .then((response) => {
      expect(response.status).to.eq(200)
      let fileDetails = response.body.find(file => file.type === "blob")
      expect(fileDetails.name).to.eq("branch3-file1")
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Verify listing ADO repositories', () => {
    cy.request(getReposBySCMType('microsoft'))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.data.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Verify ADO repository contents (acqa-repo9-azure-tf12)', () => {
    cy.request(getRepoContentsDefaultBranch('microsoft', store.adoRepoOrgAndRepoIDSlug, "/"))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(2)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   * Ticket ID: APE-7290 APE-7294 APE-7015
  ---------------------------------------------------------*/
  it('Verify ADO repository and branch contents (repo: special-scenarios', () => {
    cy.request(getRepoContentsDefaultBranch('microsoft', 'tcs-qe-org1/44f7e59b-b94f-4719-945a-e88f28d5a78a', "/"))
    .then((response) => {
      expect(response.status).to.eq(200)
      let fileDetails = response.body.find(file => file.type === "blob")
      expect(fileDetails.name).to.eq("/master-branch-file1")
      // let folderDetails = response.body.find(folder => folder.type === "tree")
      // expect(folderDetails.name).to.eq("/branch2-folder1")
    })
    cy.request(getRepoContentsForBranch('microsoft', 'tcs-qe-org1/44f7e59b-b94f-4719-945a-e88f28d5a78a', "/", "master"))
    .then((response) => {
      expect(response.status).to.eq(200)
      let fileDetails = response.body.find(file => file.type === "blob")
      expect(fileDetails.name).to.eq("/master-branch-file1")
    })
  })

  /**--------------------------------------------------------
 * Added by: Spat
 * Test Management ID:
---------------------------------------------------------*/
  it('DEMO - MUST - Verify ADO repository branches', () => {
    cy.request(getRepoBranches('microsoft', store.adoRepoOrgAndRepoIDSlug))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(2)
    })
  })

  /**--------------------------------------------------------
  * Added by: Spat
  * Test Management ID:
 ---------------------------------------------------------*/
  it('MUST - Verify ADO repository reviewers', () => {
    cy.request(getRepoReviewers('microsoft', store.adoRepoOrgAndRepoIDSlug))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(0)
    })
  })


  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Get SaaS repositories - nonsupported SCM', () => {
    cy.request(getReposBySCMType('nonsupported'))
    .then((response) => {
      expect(response.status).to.eq(406)
      expect(response.body).to.deep.eq({
        "code": 406,
        "message": "Provider \"nonsupported\" is not supported",
        "type": "INVALID_SOURCE_PROVIDER",
        "data": null
      })
    })
  })

  // /**--------------------------------------------------------
  //  * Added by: Spat
  //  * Test Management ID:
  //  * UI IS NOT USING THIS AT PRESENT
  // ---------------------------------------------------------*/
  // it('MUST - Verify ADO orgs and org-repos', () => {
  //   const targetSCM = 'microsoft'
  //   const targetOrgName = "tcs-qe-org1"
  //   cy.request(getSCMOrgs(targetSCM)).then(orgResp => {
  //     expect(orgResp.status).to.eq(200)
  //     store.targetOrgID = orgResp.body.find(orgs => orgs.name === targetOrgName).id
  //   })
  //   .then(getOrgRepos => {
  //     cy.request(getReposBySCMOrgID(targetSCM, store.targetOrgID))
  //       .then(orgRepoResp => {
  //         expect(orgRepoResp.status).to.eq(200)
  //         expect(orgRepoResp.body.find(repos => repos.source === store.adoRepoOrgAndRepoIDSlug).type).to.eq(targetSCM.charAt(0).toUpperCase() + targetSCM.slice(1))
  //       })
  //   })
  // })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Get Policy', () => {
    cy.request(getCloudProviderDefaultPolicyID('aws'))
    .then((policyResponse) => {
      expect(policyResponse.status).to.eq(200)
      store.policyID = policyResponse.body
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Create AWS project for share failing policy test ', () => {
    //Create Environment
    createProjectWithDefaultPolicies(`${getSpecBasedNamePrefix() + Date.now()}`, "aws")
    cy.get("@createProjectWithDefaultPolicy_ID")
    .then((response) => {
      store.envID = response
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Create Alert - Email, Slack and get alertID ', () => {
    cy.request(createAlert(store.envID,
      {
        eventIDs: [store.envID],
        notificationChannel: "[{\"type\":\"email\",\"values\":{\"subject\":\"AutoBots rolling out - Optimus Prime \",\"to\":[\"idontexist@tenable.com\"]}},{\"type\":\"slack\",\"values\":{\"name\":\"test-cs-alert\",\"token\":\"xoxb-2904190491763-4134807748903-fhp29cRqeCxmwyaUjQjUmXI4\"}}]", "frequency": 0, "accuricsTags": [], "priority": 1
      }
    )).then((response) => {
      expect(response.status).to.eq(204)
      //Get the alertID
      // cy.request(getAlertsConfig(store.envID)).then((response) => {
      //   expect(response.status).to.eq(200)
      //   store.alertID = response.body.id
      //   cy.log(store.alertID)
      // })
    })
  })

  // /**--------------------------------------------------------
  //  * Added by: Spat
  //  * Test Management ID:
  // ---------------------------------------------------------*/
  // it('Update Alert - MS Teams ', () => {
  //   cy.request(updateAlert({
  //     configurations: {
  //       violation_severity: ["LOW"],
  //       email: [{ enabled: true, email: "x@accurics.com", threshold: ["HIGH", "LOW"] }],
  //       slack: [],
  //       microsoft_teams: [{
  //         incoming_webhook_url: "https://outlook.office.com/webhook/16bfdff0-834a-41cb-bdc3-d9068d225630@1b25d708-64d9-43ca-a6d4-7210952163ef/IncomingWebhook/e70adf8feed84a17bcf5ac6c07732058/0f16693e-a8a6-46f8-bcb9-96e507409943",
  //         enabled: true,
  //         threshold: ["LOW", "HIGH"]
  //       }],
  //       aws_sns: [{
  //         topic_arn: "arn:aws:sns:ca-central-1:641885301384:acqa-test-sns1",
  //         region: "ca-central-1",
  //         enabled: true,
  //         threshold: ["LOW", "HIGH"]
  //       }],
  //       splunk: []
  //     },
  //     env_id: store.envID,
  //     id: store.alertID
  //   }
  //   )).then((response) => {
  //     expect(response.status).to.eq(200)
  //   })
  // })

  // /**--------------------------------------------------------
  //  * Added by: Spat
  //  * Test Management ID:
  // ---------------------------------------------------------*/
  // it('Update Alert - Slack ', () => {
  //   cy.request(updateAlert({
  //     configurations: {
  //       violation_severity: ["LOW"],
  //       email: [{ enabled: true, email: "x@accurics.com", threshold: ["HIGH", "LOW"] }],
  //       slack: [{
  //         token: "xoxb-553160171685-1299192452790-JZzel5rsvrm8e3uYkj0GxYsc",
  //         channel: "test-channel",
  //         enabled: true,
  //         threshold: ["HIGH", "MEDIUM", "LOW"]
  //       }],
  //       microsoft_teams: [{
  //         incoming_webhook_url: "https://outlook.office.com/webhook/16bfdff0-834a-41cb-bdc3-d9068d225630@1b25d708-64d9-43ca-a6d4-7210952163ef/IncomingWebhook/e70adf8feed84a17bcf5ac6c07732058/0f16693e-a8a6-46f8-bcb9-96e507409943",
  //         enabled: true,
  //         threshold: ["LOW", "HIGH"]
  //       }],
  //       aws_sns: [{
  //         topic_arn: "arn:aws:sns:ca-central-1:641885301384:acqa-test-sns1",
  //         region: "ca-central-1",
  //         enabled: true,
  //         threshold: ["LOW", "HIGH"]
  //       }],
  //       splunk: []
  //     },
  //     env_id: store.envID,
  //     id: store.alertID
  //   }
  //   )).then((response) => {
  //     expect(response.status).to.eq(200)
  //   })
  // })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Escalate a Violation', () => {
    cy.request(escalateMessage(store.envID, {
      id: store.alertID,
      environment: store.envID,
      violation: `#Dangerclose - ${getSpecBasedNamePrefix() + Date.now()}`,
      resource_type: "iac",
      source: "Autobots",
      location: 'Cybertron',
      severity: "HIGH"
    }))
    .then((response) => {
      expect(response.status).to.eq(204)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST - Create Accurics API Auth Token', () => {
    cy.request(createAPIAuthToken())
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.appToken.length).to.eq(36)
      store.apiAuthToken = response.body.appToken
      store.apiTokenID = response.body.id
    })
    // check whether its actually created
    cy.request(getApiTokens())
      .then(resp => {
        expect(resp.body.find(tokens => tokens.appName.includes(getSpecBasedNamePrefix()))).to.not.eq(undefined)
      })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
   ----------------------------------------------------------*/
  it('MUST - Verify user is able to revoke api token', () => {
    cy.request(deleteApiToken(store.apiTokenID))
      .then((response) => {
        expect(response.status).to.eq(204)
      })
    // check whether its actually deleted
    cy.request(getApiTokens())
      .then(resp => {
        expect(resp.body.find(tokens => tokens.id === store.apiTokenID)).to.eq(undefined)
      })
  })

  /**--------------------------------------------------------
    * Added by: tlikhar
    * Test Management ID:
    ---------------------------------------------------------*/
  it('MUST - Verify if revoked api token request is unauthorized', () => {
    cy.request(publicGetProjects(store.apiToken))
      .then(response => {
        expect(response.status).to.eq(403)
        expect(response.body.message).to.eq('Request is unauthenticated')
      })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('DEMO - MUST -ONPREM-SCANNER Lifecycle Add/Modify/Download/Status/Delete', () => {
    //Create BOT
    cy.request(addOnpremiseBOT({
      name: getSpecBasedNamePrefix() + Date.now(),
      description: `BOT - ${getSpecBasedNamePrefix()}`,
      type: "on_prem"
    })).then(response => {
      expect(response.status).to.eq(200)
      store.onpremScannerID = response.body.id
    }).then(changeNameAndDescription => {
      cy.request(changeOnpremiseBotNameDescription(store.onpremScannerID, {
        name: "New bot name",
        description: `new bot description`
      })).then(response => {
        expect(response.status).to.eq(204)
      })
    }).then(downloadTheBot => {
      cy.request(downloadBot(store.onpremScannerID))
      .then(response => {
        expect(response.status).to.eq(200)
        assert.isNotNull(response.body, 'response body empty')
      })
    }).then(checkBotStatus => {
      cy.request(getBOTStatusAllBots()).then(response => {
        expect(response.status).to.eq(200)
        const responseArray = response.body.find(function (x) {
          return x.botId === store.onpremScannerID;
        });
        expect(responseArray.botState).to.eq("BOT_NOT_INITIALIZED")
      })
    }).then(deleteTheBot => {
      cy.request(deleteOnpremiseBOT(store.onpremScannerID))
      .then(response => {
        expect(response.status).to.eq(204)
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  // it('ONPREM-SCANNER - Validate Onpremise scanner: SCM auth. and health statuses through bot host', () => {
  //   cy.request(getAuthStatusFromBotHost()).then(response => {
  //     expect(response.status).to.eq(202)
  //     expect(response.body).to.deep.eq({ "siacStatusCode": 200, "bitbucketStatus": "success", "githubStatus": "success", "gitlabStatus": "success" })
  //   })
  //   cy.request(getHealthStatusFromBotHost()).then(response => {
  //     expect(response.status).to.eq(200)
  //   })
  // })

  /**--------------------------------------------------------
    * Added by: Spat
    * Test Management ID:
  ---------------------------------------------------------*/
  it('AWS - Validate third party URLs used in org onboarding', () => {
    cy.request(validateURL(getUrlByName('NAU_003')))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.not.be.empty
    })
    cy.request(validateURL(getUrlByName('NAU_004')))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.not.be.empty
    })
    cy.request(validateURL(getUrlByName('NAU_005')))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.not.be.empty
    })
  })

  /**--------------------------------------------------------
  * Added by: spat
  * Test Management ID: 
  ---------------------------------------------------------*/
  it('MUST - Verify CLI downloads via /<version> and /latest urls', () => {
    downloadAndVerifyAllCLIs()
  })




})