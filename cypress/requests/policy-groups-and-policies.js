import { getUrlByName } from './apiAndNonApiUrlsMapper'
/**-------------------------------------------------------------
 * Description: calls related to accurics policies
 ---------------------------------------------------------------*/

function getPolicyGroups() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_017'), } }
function getCloudProviderDefaultPolicyID(cloudProvider) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_018')}/${cloudProvider}/defaultpolicy`} }
function getCustomPolicyGroups() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url:`${getUrlByName('AU_017')}?type=custom` } }
function getPolicyGroupByID(pID) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_017')}/${pID}` } }
function createPolicyGroup(body) { return { method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_017'), body: body } }
function updatePolicyGroup(policyID, body) { return { method: 'PUT', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_017')}/${policyID}`, body: body } }
function deletePolicyGroup(policyID) { return { method: 'DELETE', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_017')}/${policyID}`, failOnStatusCode: false } }
function testPolicy(body) { return { method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_019'), body: body } }
function getPolicies() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_020') } }
function getCustomPolicyRegoInfo(policyID) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_021')}/${policyID}/policy` } }
function createPolicy(body) { return { method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_022'), body: body } }
function getRegoResources() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_023')} }
function getRegoResourceConfig(resourceName) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_023')}/${resourceName}/config` } }
function getRegoBenchmark() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_024') } }
function getRegoCategories() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_025') } }
function getRegoSeverities() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_026') } }
function testPolicyCondition(body) { return { method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_027'), body: body } }
function deletePolicy(policyBuilderID) { return { method: 'DELETE', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_021')}/${policyBuilderID}`, failOnStatusCode: false } }

function getPoliciesV2(qs) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_028')}?${qs}` } }

function getPolicyDetails(qs) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url:`${getUrlByName('AU_020')}?${qs}`,} }

function verifyCompliantPoliciesStat(qs) {
    cy.request(getPoliciesV2(qs)).then((response) => {
        const rulesArray = response.body.Rules
        let ruleIds = []
        ruleIds.push(...rulesArray.map(emp => emp.id))
        ruleIds.forEach((ruleId) => {
            let queryString = `id=${ruleId}`
            cy.request(getPolicyDetails(queryString)).then((response) => {
                expect(response.body[0].policyRelevance).not.to.be.empty
                expect(response.body[0].remediation).not.to.be.empty
                expect(response.body[0].ruleDisplayName).not.to.be.empty
                expect(response.body[0].severity).not.to.be.empty
                expect(response.body[0].vulnerability).not.to.be.empty
                expect(response.body[0].provider).not.to.be.empty
            })
        })
    })
}

export {
    getCloudProviderDefaultPolicyID, getPolicies, deletePolicy, deletePolicyGroup, createPolicyGroup, updatePolicyGroup, getPolicyGroups, getPolicyGroupByID, testPolicy, getRegoResources, getRegoResourceConfig, getRegoBenchmark, getRegoCategories,
    getRegoSeverities, getCustomPolicyGroups, testPolicyCondition, createPolicy, verifyCompliantPoliciesStat, getPoliciesV2, getPolicyDetails, getCustomPolicyRegoInfo
}







