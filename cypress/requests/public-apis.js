import { getUrlByName } from './apiAndNonApiUrlsMapper'
/**----------------------------------------------------------------
 * Description: calls related to accurics environments and scans
 ------------------------------------------------------------------*/

function publicGetEnvDetails(apiToken) {
     return {
          method: 'GET', url: getUrlByName("AU_081"),
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicGetResourceDetails(qs, apiToken) {
     return {
          method: 'GET', url: getUrlByName("AU_082"), qs: qs,
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicGetDriftsDetails(qs, apiToken) {
     return {
          method: 'GET', url: getUrlByName("AU_083"), qs: qs,
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicGetMetricsDetails(qs, apiToken) {
     return {
          method: 'GET', url: getUrlByName("AU_084"), qs: qs,
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicGetViolationTypes(qs, apiToken) {
     return {
          method: 'GET', url: getUrlByName("AU_085"), qs: qs,
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicGetProjects(apiToken) {
     return {
          method: 'GET', url: getUrlByName("AU_086"),
          headers: { Authorization: `Bearer ${apiToken}` },
          failOnStatusCode: false
     }
}

function publicCreateProject(body, apiToken) {
     return {
          method: 'POST', url: getUrlByName("AU_086"), body: body,
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}


function publicGetSpecificProject(project_id, apiToken) {
     return {
          method: 'GET', url: `${getUrlByName("AU_086")}/${project_id}`,
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicOnboardRepoToProject(body, apiToken) { return { method: 'POST', url: getUrlByName("AU_087"), body: body, headers: { Authorization: `Bearer ${apiToken}` } } }
function publicGetRepoDetails(repoID, apiToken) { return { method: 'GET', url: `${getUrlByName("AU_087")}/${repoID}`, headers: { Authorization: `Bearer ${apiToken}` } } }
function publicScanRepo(repoID, apiToken) { return { method: 'POST', url: `${getUrlByName("AU_087")}/${repoID}/scan`, headers: { Authorization: `Bearer ${apiToken}` } } }
function publicGetIaCScanDetails(repo_scan_id, apiToken) { return { method: 'GET', url: `${getUrlByName("AU_088")}/${repo_scan_id}`, headers: { Authorization: `Bearer ${apiToken}` } } }
function publicCreatePRs(repo_scan_id, project_id, apiToken) { return { method: 'POST', url: `${getUrlByName("AU_089")}`, headers: { Authorization: `Bearer ${apiToken}` }, body: { "repo_scan_id": repo_scan_id, "project_id": project_id } } }
function publicGetPRDetails(apiToken) { return { method: 'GET', url: `${getUrlByName("AU_089")}`, headers: { Authorization: `Bearer ${apiToken}` } } }

function publicGetRepoList(body, apiToken) { return { method: 'GET', url: getUrlByName("AU_087"), body: body, headers: { Authorization: `Bearer ${apiToken}` } } }

function publicCreateException(body, apiToken) {
     return {
          method: 'POST', body: body, url: getUrlByName("AU_090"),
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicListExceptions(body, apiToken) {
     return {
          method: 'GET', body: body, url: getUrlByName("AU_090"),
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicGetExceptionDetails(exception_id, apiToken) {
     return {
          method: 'GET', url: `${getUrlByName("AU_090")}/${exception_id}`,
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicUpdateException(exception_id, body, apiToken) {
     return {
          method: 'PUT', body: body, url: `${getUrlByName("AU_090")}/${exception_id}`,
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicDeleteException(exception_id, apiToken) {
     return {
          method: 'DELETE', url: `${getUrlByName("AU_090")}/${exception_id}`,
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicCreateCloudAccount(body, apiToken){
     return {
          method: 'POST', body: body, url: getUrlByName("AU_117"),
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicFetchCloudAccount(body, queryString, apiToken){
     return {
          method: 'POST', body: body, url: getUrlByName("AU_118")+`?${queryString}`,
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicUpdateCloudAccount(body, apiToken){
     return {
          method: 'PUT', body: body, url: getUrlByName("AU_119"),
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

function publicConfigureCloudAccount(body, apiToken){
     return {
          method: 'POST', body: body, url: getUrlByName("AU_120"),
          headers: { Authorization: `Bearer ${apiToken}` }
     }
}

export {
     publicGetPRDetails, publicCreatePRs, publicGetIaCScanDetails, publicScanRepo, publicGetRepoDetails,
     publicOnboardRepoToProject, publicGetEnvDetails, publicGetResourceDetails, publicGetDriftsDetails,
     publicGetMetricsDetails, publicGetViolationTypes, publicGetProjects, publicCreateProject,
     publicGetSpecificProject, publicGetRepoList, publicCreateException, publicListExceptions,
     publicGetExceptionDetails, publicUpdateException, publicDeleteException, publicCreateCloudAccount,
     publicFetchCloudAccount, publicUpdateCloudAccount, publicConfigureCloudAccount
}

