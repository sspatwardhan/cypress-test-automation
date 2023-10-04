import { data } from '../../../fixtures/postRunValidations.json'
import { _jsonHasKeyWithMininumValue, initAPISpecRoutine } from '../../../support/utils'
import { getProjects } from '../../../requests/projects'
import { getRepos } from '../../../requests/repositoriesAndResources'
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper'

const store = {
}

describe('Supporting Operations - Filters and Searches', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))


  //--------------------- Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  data.filtersAndSearchData.forEach((requestData, requestIndex) => {
    if (requestData.skipTest) { /* Do nothing */ }
    else {
      it(`MUST - ${requestData.testID}: ${requestData.purpose}`, () => {
        // Check whether queryStrings and expectedKeyAndMinValuePerQS length matches
        expect(requestData.queryStrings.length).to.eq(requestData.expectedKeyAndMinValuePerQS.length)
        // Run a test for every query string
        requestData.queryStrings.forEach((qs, qsIndex) => {
          store.qsWithProjectAndRepoIDs = ''
          cy.log(`Validating query string ${qsIndex + 1 }`)
          // form query string by replacing projectNames with environmentIds
          .then(formQueryStringWithProjectIDs => {
            let targetProjectsArray = qs.match(/projectName=([^&]+)/g);
            // if there is/are projectName param(s) in the qs then form the new query string
            if(targetProjectsArray !== null){
              cy.log("Collecting ids for the projects mentioned in the query..")
              targetProjectsArray.forEach((tp, k) => {
                store.projectIDsArray = []
                // clean projectQsSlug before processing target project
                store.projectQsSlug = ''
                cy.log(`Getting id for ${tp}..`)
                cy.request(getProjects())
                .then(projectsResp => {
                  // create array of project IDs
                  store.projectIDsArray.push(`environmentId=${projectsResp.body.projects.find(prjs => prjs.project.includes(tp.split('=')[1])).environmentID}`)
                })
                .then(formQueryStringWithProjectIDs => {
                  cy.log(store.projectIDsArray)
                  store.qsWithProjectIDs = store.projectIDsArray.reduce((acc, replacement) => {
                    return acc.replace(/projectName=([^&]+)/g, replacement);
                  }, qs);
                })
              })
            }
            // if query string doesn't have project names
            else {
              store.qsWithProjectIDs = qs
            }
          })
          // // form query string by replacing repoURLs with repoIds + ^^
          .then(formQueryStringWithProjectAndRepoIDs => {
            let targetReposArray = store.qsWithProjectIDs.match(/repoURL=([^&]+)/g);
            // if there is/are repoURL param(s) in the qs then form the new query string
            if(targetReposArray !== null){
              targetReposArray.forEach((tr, k) => {
                store.repoIDsArray = []
                cy.log(`Getting id for ${tr}..`)
                cy.request(getRepos())
                .then(repoResp => {
                  store.repoIDsArray.push(`repoId=${repoResp.body.repos.find(r => r.repo.includes(tr.split('=')[1])).repoID}`)
                })
                .then(formQueryStringWithProjectIDs => {
                  // replace all repoURs in the store.qsWithProjectIDs
                  store.qsWithProjectAndRepoIDs = store.repoIDsArray.reduce((acc, replacement) => {
                    return acc.replace(/repoURL=([^&]+)/g, replacement);
                  }, store.qsWithProjectIDs);
                })
              })
            }
            // if query string doesn't have repo URLs
            else {
              store.qsWithProjectAndRepoIDs = store.qsWithProjectIDs
            }
          })
          .then(runTest => {
            cy.log(`Expected value set ${qsIndex + 1 }: ${requestData.expectedKeyAndMinValuePerQS[qsIndex]}`)
            cy.request({ method: requestData.method, headers: { 'x-cookie': Cypress.env('tcsToken') }, body: requestData.body, url: `${getUrlByName(requestData.requestURL)}?${store.qsWithProjectAndRepoIDs}` })
            .then(response => {
              expect(response.status).to.eq(200)
              let expectedKey = requestData.expectedKeyAndMinValuePerQS[qsIndex].split('|')[0]
              let expectedVal = requestData.expectedKeyAndMinValuePerQS[qsIndex].split('|')[1]
              expect(_jsonHasKeyWithMininumValue(response.body, expectedKey, expectedVal)).to.eq(true)
            })
          })
        })
      })
    }
  })
})