import { getUrlByName } from './apiAndNonApiUrlsMapper'
import { _sixtySeconds, _tenSeconds, _twentySeconds, getSpecBasedNamePrefix } from "../support/utils"
const store = {}

function connectJira(jiraDomain, jiraEmail, jiraToken) {
    return {
        failOnStatusCode: false, //This is for of validating negative test scenarios
        method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: getUrlByName('AU_005'), failOnStatusCode: false,
        body: {
            domain: jiraDomain,
            email: jiraEmail,
            token: jiraToken
        }
    }
}

function disconnectJira() {
    return {
        method: 'DELETE', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: getUrlByName('AU_006')
    }
}

function getJiraIssuesByProject(projectID) {
    return {
        method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: `${getUrlByName('AU_007')}/?environmentId=${projectID}`,
    }
}

function getJiraProjects() {
    return {
        method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: getUrlByName('AU_008')
    }
}

function createJiraTicket(body) {
    return {
        method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: getUrlByName('AU_009'),
        body: body
    }
}

function getJiraIssueTypes(project_id) {
    return {
        method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: `${getUrlByName('AU_010')}?project-id=${project_id}`
    }
}

function getJiraUsers(project_key) {
    return {
        method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: `${getUrlByName('AU_011')}?project-key=${project_key}`
    }
}

function searchJiraUsers(project_key, search_key) {
    return {
        method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: `${getUrlByName('AU_011')}?project-key=${project_key}&search=${search_key}`
    }
}

function getJiraPriorities() {
    return {
        method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: `${getUrlByName('AU_038')}`
    }
}

function getJiraIssueFields(project_id, issue_type_id) {
    return {
        method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: `${getUrlByName('AU_012')}?project-id=${project_id}&issue-type-id=${issue_type_id}`
    }
}

function configureJiraIntegration(body) {
    return {
        method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: getUrlByName('AU_013'), failOnStatusCode: false,
        body: body
    }
}

function getJiraIntegration() {
    return {
        method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: getUrlByName('AU_013'),
    }
}

function deleteJiraIntegration(setting_id) {
    return {
        method: 'DELETE', headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: `${getUrlByName('AU_013')}/${setting_id}`
    }
}

function getCountOfServiceTicketsFromDashboard() {
    return {
        method: 'GET',
        headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: getUrlByName('AU_014'),
    }
}

function getCountOfServiceTicketsFromRemediatePage() {
    return {
        method: 'GET',
        headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: getUrlByName('AU_007'),
    }
}

function getCountOfPrsFromDashboard() {
    return {
        method: 'GET',
        headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: getUrlByName('AU_015'),
    }
}

function getCountOfPrsFromRemediatePage() {
    return {
        method: 'GET',
        headers: { 'x-cookie': Cypress.env('tcsToken') },
        url: `${getUrlByName('AU_016')}/?limit=500`
    }
}

export {
    getJiraPriorities, configureJiraIntegration, getJiraIssueFields, getJiraIssuesByProject,
    getJiraUsers, getSpecBasedNamePrefix, createJiraTicket, disconnectJira, connectJira,
    getJiraProjects, getJiraIssueTypes, getJiraIntegration, deleteJiraIntegration, searchJiraUsers, getCountOfServiceTicketsFromDashboard, getCountOfServiceTicketsFromRemediatePage, getCountOfPrsFromDashboard, getCountOfPrsFromRemediatePage
}
