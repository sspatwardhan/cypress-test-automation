import { getUrlByName } from './apiAndNonApiUrlsMapper'
import { _sixtySeconds, _twentySeconds, _threeSeconds, _tenSeconds, _sixMins, generateRandomNumber, getSpecBasedNamePrefix } from '../support/utils'
import 'cypress-wait-until';
const supportedSCMS = ['github','bitbucket','gitlab','microsoft']
const store = {}
let repoStatusCheckAttempt = 0
/**-------------------------------------------------------------
 * Description: calls related to accurics env. repositories
 ---------------------------------------------------------------*/

function getRepos() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_036') } }

function getReposInPaginatedForm(qs) {
    return {
        method: 'GET',
        headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: `${getUrlByName('AU_036')}/?${qs}`
    }
}

function getReposBySCMType(scmType) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_034')}/${scmType}/reposv2`, failOnStatusCode: false } }

function getRepoStatsByID(repoID) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_035')}/${repoID}` } }

function getScanRuns(repoID) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_046')}?repoId=${repoID}` } }

function getRepoIdsForProject(projectID) {
    return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_047')}/${projectID}`}
}

function getGlobalResourcesDataWithTypes(qs) {
    return {
        method: 'GET',
        headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: `${getUrlByName('AU_041')}?${qs}`
    }
}

function getGlobalResourcesData(qs) {
    return {
        method: 'GET',
        headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: `${getUrlByName('AU_039')}?${qs}`
    }
}

function verifyfilteredResources(qs, customQueryString) {
    /**
         * This function is used to verify the filtered resources data from the server response and the UI
         * @param qs - query string
         * @param customQueryString - This is the custom query string for filtering out the resources.
         * @returns {object} globalResourcesData including serverResponse and resourcesDataFromUI
     */
    let queryString = `${qs}&${customQueryString}`;
    let globalResourcesData = {};
    /* It is making a request to the api /v2/api/resources/global/types getting the response including types array.*/
    cy.request(getGlobalResourcesDataWithTypes(queryString)).then(response => {
        expect(response.status).to.eq(200);
        /* Generating a random number between 0 and the length of the types array. */
        let randomNumberGenerated = generateRandomNumber(response.body.types.length);
        globalResourcesData.serverResponse = response.body.types[randomNumberGenerated];
    }).then(getDetailsOfRandomResource => {
        queryString = `${qs}&limit=20&offset=0&type=${globalResourcesData.serverResponse.type}&${customQueryString}`
    /* It is making a request to the api /v2/api/resources/global/resources and getting the response including resources array */
        cy.request(getGlobalResourcesData(queryString)).then(response => {
            const resourcesArray = response.body.resources;
            globalResourcesData.resourcesDataFromUI = resourcesArray[0];
            // Validating the response from the server with the data in the UI.
            expect(globalResourcesData.serverResponse.count).to.eq(response.body.count);
            expect(globalResourcesData.serverResponse.categoryDisplay).to.eq(resourcesArray[0].categoryDisplay);
            expect(globalResourcesData.serverResponse.type).to.eq(resourcesArray[0].type);
            let resCategoryInUI = (resourcesArray[0].resCategory === undefined ? '' : resourcesArray[0].resCategory)
            expect(globalResourcesData.serverResponse.typeCategory).to.eq(resCategoryInUI);
            expect(globalResourcesData.serverResponse.typeDisplay).to.eq(resourcesArray[0].typeDisplay);
        })
    }).then(() => {
        cy.wrap(globalResourcesData).as('globalResourcesData')
    })
}
function onboardRepoToProject(body) { return { method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_053'), body: body } }

function deleteRepo(repoID) { return { method: 'DELETE', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_035')}/${repoID}`, failOnStatusCode: false } }

function associateRepoToProject(body){ return { method: 'PUT', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_047'), failOnStatusCode: false, body: body } }

function isInTerminationStatus_IaC(status) { return (status === 'READY' || status === 'ERROR' || status === 'COMPLETED') }

function waitForRepoStatusReady(repoID) {
    cy.waitUntil(() => cy.request(getRepoStatsByID(repoID)).then(repoResponse => Boolean(isInTerminationStatus_IaC(repoResponse.body.status))), {
        errorMsg: `expected IaC status is not READY|ERROR|COMPLETED.`,
        timeout: _sixtySeconds,
        interval: _threeSeconds
      });
}

function waitForExpectedWebhookStatus(repoID, webHookStatus){
    cy.waitUntil(() => cy.request(getRepoStatsByID(repoID)).then(repoResponse => repoResponse.body.webhook === webHookStatus), {
        errorMsg: `expected Webhook status is ${webHookStatus}`,
        timeout: _sixtySeconds,
        interval: _threeSeconds
      });
}

function getRepoViolationSummary(repoId){                   /* returns the violation summary of the repo */ 
    return{
         method:'GET', 
         headers: { 'x-cookie': Cypress.env('tcsToken') },
         url:`${getUrlByName('AU_035')}/${repoId}/violationsummary`
    }
}

function isTcsWebhook(scmType, responseBody, repoID){
    if(scmType === "github"){
            return responseBody.some(element => element.config.url.includes(repoID))
    }else if (scmType === "bitbucket"){
            return responseBody.values.some(element => element.url.includes(repoID))
    }
}

function onboardReposThroughProject(body) {
    /**
    * Returns envDetails array containing envId and repoIDs
    *
    * @param {json} body includes repos, provider, enginetype, source etc 
    * @return {Array} envDetails for example ["envId", [repoIDs]]
    */
    let envDetails = []
    cy.request(onboardRepoToProject(body)).then((response) => {
        expect(response.status).to.eq(202)
        expect(response.body[0].id).to.not.be.empty
        const envID = response.body[0].id
        envDetails.push(envID)
    })
        .then(() => {
            cy.waitUntil(() => cy.request(getRepoIdsForProject(envDetails[0])).then(response => response.body.status === "READY"), {
                errorMsg: 'Repo status is not READY',
                timeout: _sixtySeconds,
                interval: _threeSeconds
            })
        })
        .then((getRepoIds) => {
            cy.request(getRepoIdsForProject(envDetails[0])).then(response => {
                const repoIDs = response.body.repoIds
                envDetails.push(repoIDs)
            })
        })
        .then(() => {
            return cy.wrap(envDetails).as('envDetails')
        })
}

function getRepoReviewers(gitHost, repoURL) {
    return {
         method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
         url: `${getUrlByName('AU_034')}/${gitHost}/reviewers/${repoURL}`
    }
}

function getRepoBranches(gitHost, repoURL) {
    return {
         method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
         url: `${getUrlByName('AU_034')}/${gitHost}/branches/${repoURL}`
    }
}

function getRepoContentsDefaultBranch(gitHost, repoURL, path) {
    return {
         method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
         url: `${getUrlByName('AU_034')}/${gitHost}/contents/${repoURL}?path=${path}`
    }
}

function getRepoContentsForBranch(gitHost, repoURL, path, branch) {
    return {
         method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
         url: `${getUrlByName('AU_034')}/${gitHost}/contents/${repoURL}?path=${path}&branch=${branch}`
    }
}

function createPR(envID, gitType, resourceType, resourceName, violationName, repo, iacFileName, reviewerName) {
    //Get resource's accuricsId and violationSlug
    cy.waitUntil(() => cy.request(getGlobalResourcesData(`environmentId=${envID}&limit=20&type=${resourceType}`))
    .then(
         response => response.body.resources.length > 0), {
         errorMsg: `Resources for project id ${envID} was not returned on time.`,
         timeout: _sixMins,
         interval: _tenSeconds
    })
    let branchName = (gitType.includes("enterprise")) ? "main" : "master"

    cy.request(getGlobalResourcesData(`environmentId=${envID}&limit=20&type=${resourceType}`))
    .then((response) => {
         for (var r in response.body.resources) {
              if (typeof response.body.resources[r]["iacName"] !== 'undefined' && response.body.resources[r]["iacName"] === resourceName) {
                   /**
                    * Traverse through all violations and see whether
                    * expected violation is detected
                    */
                   for (var v in response.body.resources[r].violations) {
                        if (response.body.resources[r].violations[v].violation.name.includes(violationName)) {
                             // Cypress.env('accuricsResId',response.body.resources[r].accuricsId)
                             // Cypress.env('accuricsResViolationSlug',response.body.resources[r].violations[v].resourceViolationSlug)

                             store.accuricsResId = response.body.resources[r].accuricsId
                             store.accuricsResViolationSlug = response.body.resources[r].violations[v].resourceViolationSlug
                        }
                   }
              }
         }
         // expect(store.accuricsResViolationSlug).to.not.be.empty
    })
    .then(fetchRepoReviewers => {
         //Fetch reviewer details
         if (reviewerName) {
              cy.request(getRepoReviewers(gitType.toLowerCase(), repo)).then((response) => {
                   console.log(response.body)
                   var reviewerDetails = response.body.filter(function (reviewer) {
                        return reviewer.name == reviewerName;
                   });
                   // // Cypress.env('reviewerDetails',reviewerDetails)
                   store.accuricsReviewerDetails = reviewerDetails
                   // expect(store.accuricsReviewerDetails).to.not.be.empty
              })
         } else { store.accuricsReviewerDetails = [] }
    })
    .then(createPR => {
         if (gitType == 'Gitlab') {
              repo = "unused/30545295"
              // TODO: There is currently no accurics endpoint available to fetch the group/project id from gitlab
         }
         cy.request({
              method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_034')}/${gitType}/remediation/iac`,
              body: {
                   repository: repo,
                   source: { branch: { name: `bugfix/${getSpecBasedNamePrefix() + Date.now()}` } },
                   destination: { branch: { name: branchName } },
                   title: `BAT-PR-${envID}`,
                   description: `BAT-PR-${envID}`,
                   reviewers: store.accuricsReviewerDetails,
                   iacSourcePath: iacFileName,
                   environmentId: envID,
                   resourceViolations: [{
                        violationId: `${store.accuricsResViolationSlug}`,
                        accuricsId: `${store.accuricsResId}`
                   }],
                   remediationDetails: [{ "Id": `${resourceType}.${resourceName}`, "CodeType": "block", "Expected": "ewogICJ2ZXJzaW9uaW5nIjogewogICAgImVuYWJsZWQiOiB0cnVlCiAgfQp9", "Attribute": "", "ReplaceType": "add", "CodeType": "block", "lineNumber": 116, "AttributeDataType": "base64" }],
                   type: `${gitType}`
              }
              // TODO: Need to find a way to fetch remediation details
         })
              .then(response => {
                   if (`${gitType}`.includes('enterprise')) {
                        expect(response.status).to.eq(200)
                   }
                   else {
                        expect(response.status).to.eq(200)
                        expect(response.body.pullRequestId).to.not.be.empty
                   }
              })
    })
}

export { createPR, getRepoContentsForBranch, getRepoContentsDefaultBranch, getRepoBranches, getRepoReviewers, getRepoIdsForProject, getReposBySCMType, getRepos, deleteRepo, onboardRepoToProject, getRepoStatsByID, waitForRepoStatusReady, getScanRuns, waitForExpectedWebhookStatus, isTcsWebhook, associateRepoToProject, onboardReposThroughProject, getRepoViolationSummary, getReposInPaginatedForm, verifyfilteredResources, getGlobalResourcesDataWithTypes, getGlobalResourcesData  }
