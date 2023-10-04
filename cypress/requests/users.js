import { getUrlByName } from './apiAndNonApiUrlsMapper'

/**-------------------------------------------------------------
 * Description: calls related to user management
 ---------------------------------------------------------------*/

function callExternalAPI(apiCall, body) { return { method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName("AU_091")}/${apiCall}`, body: body } }
function changePassword(userID, body) { return { method: 'PUT', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName("AU_092")}/${userID}/changepassword`, body: body } }
function addUser(body) { return { method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName("AU_092"), body: body } }
function updateUser(userID, body) { return { method: 'PUT', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName("AU_092")}/${userID}`, body: body } }
function getCurrentUser() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: '/v1/api/auth/me', failOnStatusCode: false } }
function deleteUser(userID) { return { method: 'DELETE', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName("AU_092")}/${userID}`, failOnStatusCode: false } }
function getUsers() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName("AU_092") } }
function getUserByID(userID) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName("AU_092")}/${userID}` } }
function validateUserRoleOnEnvironment(userID, roleName, envID) {
     cy.request(getUserByID(userID)).then(userResponse => {
          let userRoles = userResponse.body[0].roles
          let userRoleEnvStatus = 'user_role_and_env_not_found'
          //traverse through roles
          for (var r in userRoles) {
               if (userRoles[r].role === roleName) {
                    userRoleEnvStatus = 'user_role_found'
                    //traverse through environments
                    let userEvs = userRoles[r].environment
                    for (var uev in userEvs) {
                         if (userEvs[uev].id === envID) {
                              userRoleEnvStatus = 'user_role_and_env_found'
                              // expect(userEvs[uev].id).to.eq(envID)
                              break
                         }
                    }
               }
          }
          expect(userRoleEnvStatus).to.eq('user_role_and_env_found')
     })
}
function sendSCMOnboardingInvite(userEmail, firstName, lastName, scmType) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName("AU_093"), body: {
               "scm_type": scmType,
               "recipients": [
                    {
                         "email": userEmail,
                         "firstname": firstName,
                         "lastname": lastName,
                         "job": "Test Automation"
                    }
               ]
          }
     }
}

function sendCloudOnboardingInvite(userEmail, firstName, lastName, scmType) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName("AU_094"), body: {
               "recipients": [
                    {
                         "email": userEmail,
                         "firstname": firstName,
                         "lastname": lastName,
                         "job": "Test Automation"
                    }
               ]
          }
     }
}
// Whether the user has been invited for onboarding
function getSCMOnboardingInviteStatus() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName("AU_095"), failOnStatusCode: false } }
// Whether any user in the tenant has onboarded/uninstalled accurics app from SCM
function getSCMOnboardingStatus() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName("AU_096"), failOnStatusCode: false } }

export {
     getSCMOnboardingStatus, getSCMOnboardingInviteStatus, sendSCMOnboardingInvite, validateUserRoleOnEnvironment, getUserByID, updateUser, changePassword, callExternalAPI, addUser, deleteUser, getUsers, getCurrentUser
}