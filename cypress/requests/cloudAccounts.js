import { getUrlByName } from './apiAndNonApiUrlsMapper'

function deleteCloudAccount(cloudAccountIDs) {
    return {
        method: 'DELETE', url: `${getUrlByName('AU_004')}/${cloudAccountIDs}?action=delete`,
        headers: { 'x-cookie': Cypress.env('tcsToken') }
    }
}

function onboardCloudAccount(data) {
    return {
        method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
        failOnStatusCode: false,
        url: getUrlByName('AU_001'),
        body: data,
    }
}

function ignoreCloudAccount(cloudAccountID) {
    return {
        method: 'DELETE', headers: { 'x-cookie': Cypress.env('tcsToken') },
        failOnStatusCode: false,
        url: `${getUrlByName('AU_004')}/${cloudAccountID}`,

    }
}

function getMemberCloudAccounts() {
    return {
        method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
        failOnStatusCode: false,
        url: getUrlByName('AU_004'),
        body: { "statuses": [] },
    }
}

function getCloudAccountIDs() {
    /**
 *
 * @returns \{ provider_cloud_account_id : tcs_given_id }
 * e.g.
 * {
 *   aws_536274239938: "80d6f062-4549-4ecd-8289-fa0f680816d3",
 *   azure_9c8988b4_d223_45a9_a7f2_e7b71c7a0ed6: "0481d4b8-0b29-4375-a949-79e6b09ca29a"
 * }
 */
    let cloudAccounts = {}
    cy.request(getMemberCloudAccounts()).then(response => {
        response.body.forEach(ca => {
            //replacing - with _ in the key as JSON doesn't support it
            cloudAccounts[`${ca.provider}_${ca.accountID.replaceAll('-', '_')}`] = ca.id
        })
    })
    
    return cloudAccounts
}

function getCloudAccount() {
    return {
        method: 'GET',
        headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: getUrlByName('AU_002'),
    }
}

function getGlobalClouds() {
    return {
        method: 'GET',
        headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: getUrlByName('AU_003'),
    }
}
export { deleteCloudAccount, onboardCloudAccount, ignoreCloudAccount, getCloudAccountIDs, getCloudAccount ,getMemberCloudAccounts,getGlobalClouds}