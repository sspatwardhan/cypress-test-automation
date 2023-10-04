import { getUrlByName } from './apiAndNonApiUrlsMapper'
import { _tenSeconds, _threeMins, _sixMins, _sixtySeconds, _threeSeconds, _fifteenSeconds, _fourtySeconds, letsWait, getSpecBasedNamePrefix, _fifteenMins, _twoMins } from '../support/utils'
import { deletePolicy, getCustomPolicyGroups, deletePolicyGroup, getCloudProviderDefaultPolicyID, getPoliciesV2 } from './policy-groups-and-policies'
import { getRepoReviewers, deleteRepo, getRepos } from './repositoriesAndResources'
import { getGlobalResourcesData } from './repositoriesAndResources'
import { getApiTokens, deleteApiToken } from '../requests/integrations'
import 'cypress-wait-until';
import { deleteCloudAccount, getMemberCloudAccounts } from './cloudAccounts'
const store = {}
var cloudScanAttempt = 0
/**----------------------------------------------------------------
 * Description: calls related to accurics environments and scans
------------------------------------------------------------------*/
function validateCloudAccount(body) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_061'),
          body: body
     }
}

function getAWSVPCs(awsRegion, awsRoleARN_or_awsAccessKey, awsExternalID_or_awsSecretKey) {
     let envsParam;
     if (awsRoleARN_or_awsAccessKey.startsWith("arn:")) {
          envsParam = ["ROLE_ARN:" + awsRoleARN_or_awsAccessKey, "EXTERNAL_ID:" + awsExternalID_or_awsSecretKey];
     }
     else {
          envsParam = ["AWS_ACCESS_KEY_ID:" + awsRoleARN_or_awsAccessKey, "AWS_SECRET_ACCESS_KEY:" + awsExternalID_or_awsSecretKey];
     }

     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_062'),
          body: {
               request: "get",
               args: "vpc",
               region: awsRegion,
               envs: envsParam
          }
     }
}

function getAzMgmtGroups(azClientID, azClientSecret, azTenantID,) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_063'),
          body: {
               request: "get",
               args: "managementgroups",
               envs: ["ARM_CLIENT_ID:" + azClientID, "ARM_CLIENT_SECRET:" + azClientSecret, "ARM_TENANT_ID:" + azTenantID]
          }
     }
}

function getSubscriptions(azClientID, azClientSecret, azTenantID,) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_064'),
          body: {
               request: "get",
               args: "subscriptions",
               envs: ["ARM_CLIENT_ID:" + azClientID, "ARM_CLIENT_SECRET:" + azClientSecret, "ARM_TENANT_ID:" + azTenantID]
          }
     }
}

function getAzureResourceGroups(azClientID, azClientSecret, azTenantID, azSubID) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_065'),
          body: {
               envs: ["ARM_CLIENT_ID:" + azClientID, "ARM_CLIENT_SECRET:" + azClientSecret,
               "ARM_SUBSCRIPTION_ID:" + azSubID, "ARM_TENANT_ID:" + azTenantID]
          }
     }
}

function getEnvs() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_047'), } }
function getProjects() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_052') } }

function getResourcesForProject(envId, qs) {
     return {
          method: 'GET',
          headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: `${getUrlByName('AU_066')}/${envId}/history/summary?${qs}`
     }
}

function getResourcesByProjectId(envID) {
     return {
          method: 'GET',
          url: `${getUrlByName('AU_052')}?environmentId=${envID}`,
          headers: { 'x-cookie': Cypress.env('tcsToken') },
     }
}

function getProjectCloudProvider(envID) {
     cy.request(getEnvs())
     .then((response) => {
          const cloudProvider = response.body.find((env) =>
               env.id === envID)
          return cy.wrap(cloudProvider.provider).as('cProvider')
     })
}

function createEnv(body) { return { method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_047'), body: body } }

function createProjectWithDefaultPolicies(projectName, cloudProvider) {
     cy.request(getCloudProviderDefaultPolicyID(cloudProvider.toLowerCase()))
     .then((policyResponse) => {
          expect(policyResponse.status).to.eq(200)
          store.policyID = policyResponse.body
     })
     .then(createProjectWithDefaultPolicy => {
          cy.request(createEnv({
               provider: cloudProvider.toLowerCase(),
               name: projectName,
               policies: [store.policyID]
          }))
          .then((envResponse) => {
               cy.wrap(envResponse.body.id).as("createProjectWithDefaultPolicy_ID")
          })
     })
}

function updateEnv(body) { return { method: 'PUT', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_047'), body: body } }


function deleteEnv(envID) { return { method: 'DELETE', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_047')}/${envID}`, failOnStatusCode: false } }

function updateCFTConfig(envID, cftConfigPayload) { return { method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_047')}/${envID}/cft/config`, body: cftConfigPayload, failOnStatusCode: false } }

function doIaCScan(envID) { return { method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_047')}/${envID}/rescan` } }

function getK8sClusters(qs) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_037')}?` + qs,
          body: JSON.stringify({})
     }
}
// function getIacScanStatus(envID) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `/v1/api/env/${envID}/iacscanstatus` } }

function doCloudScan(envID, resourcesToBeScanned) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_067'),
          body: { envId: envID, args: `--resources ${resourcesToBeScanned}` }
     }
}

function getCloudScanProfiles(envID) {
     return {
          method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_068')}/${envID}/profile`
     }
}

function createCloudScanProfile(envID, profilePayload) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_068')}/${envID}/profile/`,
          body: profilePayload
     }
}

function updateCloudScanProfile(envID, profileID, udpdateProfilePayload) {
     return {
          method: 'PUT', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_068')}/${envID}/profile/${profileID}`,
          body: udpdateProfilePayload
     }
}

function deleteCloudScanProfile(envID, profileID) {
     return {
          method: 'DELETE', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_068')}/${envID}/profile/${profileID}`
     }
}

function doCloudScanThroughProfile(envID, profileID) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_067'),
          body: { envId: envID, profileId: profileID }
     }
}

function isInTerminationStatus_Cloud(status) { return status === 'Successful' || status === 'Failed' || status === 'Cancelled' || status === 'Completed with errors' }

function cancelCloudScanByGroupId(groupId) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_067')}/${groupId}/cancel`,
          body: {}
     }
}

function getSnapshotStats(envID) {
     return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_066')}/${envID}/snapshots` }
}

function getCloudScanStatus(envID) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_068')}/${envID}/status` } }


function waitForCloudScanToFinish(envID, envName) {
     //Need to add wait just before calling getCloudScanStatus to avoid cloudbees failures
     letsWait(`Wait for cloud scan to start`, _tenSeconds)
     cy.waitUntil(() => cy.request(getCloudScanStatus(envID))
     .then(
          csResponse => Boolean(isInTerminationStatus_Cloud(csResponse.body[0].cloud_scan_summary.scan_status))), {
     errorMsg: `BAT: cloudScan status for project ${envName} was not returned as Successful or Failed well in time.`,
     timeout: _fifteenMins,
     interval: _twoMins
     });
}

function getFilteredViolations(envID, filters) {
     let requestURL = ""
     // All filters should be passed as string "&mapped=true" or "?hasViolations=true&type="  
     if (envID == null) {
          requestURL = `${getUrlByName('AU_042')}?${filters}`
     } else {
          requestURL = `${getUrlByName('AU_042')}?environmentId=${envID}${filters}`
     }
     return {
          method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: requestURL
     }
}

function getProjectPRs(envID, prLimit) {
     return {
          method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
          // All filters should be passed as string "&mapped=true" or "?hasViolations=true&type="
          url: `${getUrlByName('AU_016')}?environmentId=${envID}&limit=${prLimit}`
     }
}

function verifyAWSResourceMapping(envID) {
     // letsWait(`Wait for CMDB to compile results for ${envID}`,_fifteenSeconds)
     // Collect mapped resources
     cy.request(getGlobalResourcesData(`environmentId=${envID}&mapped=true`))
     .then(snapResponse => {
          expect(snapResponse.status).to.eq(200)
          var mappedResources, awsResourcesToMap, unmappedResources, i, r
          // Collect scanned resources as csv
          for (i = 0; i < snapResponse.body.resources.length; i++) {
               mappedResources += "," + snapResponse.body.resources[i].name
          }
          //Remove undefined
          mappedResources = mappedResources.replace('undefined,', "")
          mappedResources = mappedResources.replace(',undefined', '')
          mappedResources = mappedResources.replace('undefined', '')

          //Fail Fast
          // assert.isDefined(mappedResources, 'There are no mapped resources');

          // Translate a few resource type names from TFer style to AWS style,
          // So that it could be found in mappedResources string
          awsResourcesToMap = Cypress.env("awsCloudResourcesToBeScannedWithProfile")
          awsResourcesToMap = awsResourcesToMap.toString().replace(",sg", ",aws_security_group")
          awsResourcesToMap = awsResourcesToMap.toString().replace(",alb", ",aws_lb")
          awsResourcesToMap = awsResourcesToMap.toString().replace(",ec2_instance", ",aws_instance")
          awsResourcesToMap = awsResourcesToMap.toString().replace(",es", ",aws_elastisearch_domain")
          awsResourcesToMap = awsResourcesToMap.toString().replace(",igw", ",aws_internet_gateway")
          awsResourcesToMap = awsResourcesToMap.toString().replace(",nacl", ",aws_network_acl")
          awsResourcesToMap = awsResourcesToMap.toString().replace(",rds", ",aws_db_instance")
          awsResourcesToMap = awsResourcesToMap.toString().replace(",auto_scaling", ",aws_autoscaling_group")
          awsResourcesToMap = awsResourcesToMap.toString().replace(",eni", ",aws_network_interface")

          // Whether the resources in awsResourceToScan parameter are mapped
          for (r = 0; r <= awsResourcesToMap.split(",").length; r++) {
               if (!mappedResources.includes(awsResourcesToMap.split(",")[r])) {
                    unmappedResources += "," + awsResourcesToMap.split(",")[r]
               }
          }
          unmappedResources = unmappedResources.replace('undefined,', '')
          unmappedResources = unmappedResources.replace(',undefined', '')
          unmappedResources = unmappedResources.replace('undefined', '')

          if (unmappedResources != "" && typeof unmappedResources != 'undefined') {
               // Get rid of undefined resource
               console.log("Unmapped resources found: " + unmappedResources);
               // expect(unmappedResources.split(",").length).to.eq(0);
          }
          else {
               console.log("Appears like all resources got mapped!!")
          }
     })
}

function verifyAzureResourceMapping(envID) {
     letsWait(`Wait for CMDB to compile results for ${envID}`, _fifteenSeconds)
     // Collect mapped resources
     cy.request(getGlobalResourcesData(`environmentId=${envID}&mapped=true`))
     .then(snapResponse => {
          expect(snapResponse.status).to.eq(200)
          var mappedResources, azureResourcesToMap, unmappedResources, i, r
          // Collect scanned resources as csv
          for (i = 0; i < snapResponse.body.types.length; i++) {
               mappedResources += "," + snapResponse.body.types[i].type
          }
          //Fail Fast
          assert.isDefined(mappedResources, 'There are no mapped resources');

          cy.log(azureResourcesToMap)
          azureResourcesToMap = Cypress.env("azCloudResourcesToBeScanned")
          azureResourcesToMap = azureResourcesToMap.replace(",application_security_group", ",azurerm_application_security_group")
          azureResourcesToMap = azureResourcesToMap.replace(",app_service_certificate_order", ",azurerm_app_service_certificate_order")
          azureResourcesToMap = azureResourcesToMap.replace(",availability_set", ",azurerm_availability_set")
          azureResourcesToMap = azureResourcesToMap.replace(",databricks_workspace", ",azurerm_databricks_workspace")
          azureResourcesToMap = azureResourcesToMap.replace(",express_route_circuit", ",azurerm_express_route_circuit")
          azureResourcesToMap = azureResourcesToMap.replace(",express_route_gateway", ",azurerm_express_route_gateway")
          azureResourcesToMap = azureResourcesToMap.replace(",lb", ",azurerm_lb")
          azureResourcesToMap = azureResourcesToMap.replace(",virtual_machine_scale_set", ",azurerm_linux_virtual_machine_scale_set")
          azureResourcesToMap = azureResourcesToMap.replace(",local_network_gateway", ",azurerm_local_network_gateway")
          azureResourcesToMap = azureResourcesToMap.replace(",disk", ",azurerm_managed_disk")
          azureResourcesToMap = azureResourcesToMap.replace(",monitor_action_group", ",azurerm_monitor_action_group")
          azureResourcesToMap = azureResourcesToMap.replace(",monitor_autoscale_setting", ",azurerm_monitor_autoscale_setting")
          azureResourcesToMap = azureResourcesToMap.replace(",network_interface", ",azurerm_network_interface")
          azureResourcesToMap = azureResourcesToMap.replace(",network_security_group", ",azurerm_network_security_group")
          azureResourcesToMap = azureResourcesToMap.replace(",network_watcher", ",azurerm_network_watcher")
          azureResourcesToMap = azureResourcesToMap.replace(",point_to_site_vpn_gateway", ",azurerm_point_to_site_vpn_gateway")
          azureResourcesToMap = azureResourcesToMap.replace(",proximity_placement_group", ",azurerm_proximity_placement_group")
          //there are 2 public ips
          azureResourcesToMap = azureResourcesToMap.replace(",public_ip", ",azurerm_public_ip")
          azureResourcesToMap = azureResourcesToMap.replace(",public_ip_prefix", ",azurerm_public_ip_prefix")
          azureResourcesToMap = azureResourcesToMap.replace(",resource_group", ",azurerm_resource_group")
          azureResourcesToMap = azureResourcesToMap.replace(",route_table", ",azurerm_route_table")
          azureResourcesToMap = azureResourcesToMap.replace(",snapshot", ",azurerm_snapshot")
          azureResourcesToMap = azureResourcesToMap.replace(",virtual_hub", ",azurerm_virtual_hub")
          azureResourcesToMap = azureResourcesToMap.replace(",virtual_network", ",azurerm_virtual_network")
          azureResourcesToMap = azureResourcesToMap.replace(",virtual_wan", ",azurerm_virtual_wan")
          azureResourcesToMap = azureResourcesToMap.replace(",vpn_gateway", ",azurerm_vpn_gateway")
          //there are 2 vpn server config
          azureResourcesToMap = azureResourcesToMap.replace(",vpn_server_configuration", ",azurerm_vpn_server_configuration")

          // Whether the resources in awsResourceToScan parameter are mapped
          for (r = 0; r <= azureResourcesToMap.split(",").length; r++) {
               if (!mappedResources.includes(azureResourcesToMap.split(",")[r])) {
                    unmappedResources += "," + azureResourcesToMap.split(",")[r]
               }
          }
          if (unmappedResources != "" && typeof unmappedResources != 'undefined') {
               // Get rid of undefined resource
               unmappedResources = unmappedResources.replace("undefined,", "")
               unmappedResources = unmappedResources.replace(",undefined", "")
               unmappedResources = unmappedResources.replace("undefined", "")
               console.log("Unmapped resources found: " + unmappedResources);
               expect(unmappedResources.split(",").length).to.eq(0);
          }
          else {
               cy.log("Appears like all resources got mapped!!")
          }
     })
}

function verifyViolations(envID) {
     getProjectCloudProvider(envID)
     cy.get('@cProvider')
     .then(cloudProvider => {
          console.log("Cloud Provider ~~~~" + cloudProvider)
          //Read Expected Drifts
          store.detectedViolations = []
          //Read awsExpectedViolations
          Cypress.env(`${cloudProvider}ExpectedViolations`).forEach(function (row) {
               //Send request for every type value mentioned in the testdata
               cy.request(getGlobalResourcesData(`environmentId=${envID}&type=${row.split(",")[0]}&hasViolation=true`))
               .then((response) => {
                    expect(response.body.count).to.greaterThan(0)
                    for (var r in response.body.resources) {
                         if (typeof response.body.resources[r]["iacName"] !== 'undefined' && response.body.resources[r]["iacName"] === row.split(",")[1]) {
                              cy.log(response.body.resources[r]["iacName"] + " : " + row.split(",")[1])
                              /**
                               * Traverse through all violations and see whether
                               * expected violation is detected
                               */
                              for (var v in response.body.resources[r].violations) {
                                   if (response.body.resources[r].violations[v].violation.name == row.split(",")[2]) {
                                        expect(true).to.eq(response.body.resources[r].violations[v].violation.name == row.split(",")[2])
                                   }
                              }
                         }
                    }
               })
          })
     })
}

function verifyDrifts(envID) {
     getProjectCloudProvider(envID)
     cy.get('@cProvider')
     .then(cloudProvider => {
          console.log("Cloud Provider ~~~~" + cloudProvider)
          //Read Expected Drifts
          Cypress.env(`${cloudProvider}ExpectedDrifts`).forEach(function (row) {
               //Send request for every type value mentioned in the testdata
               cy.request(getGlobalResourcesData(`environmentId=${envID}&hasDrift=true&type=${row.split(",")[0]}`))
               .then((response) => {
                    expect(response.body.count).to.greaterThan(0)
                    for (var r in response.body.resources) {
                         if (typeof response.body.resources[r]["iacName"] !== 'undefined' && response.body.resources[r]["iacName"] === row.split(",")[1]) {
                              cy.log(response.body.resources[r]["iacName"] + " : " + row.split(",")[1])
                              /**
                               * Traverse through all drifts and see whether
                               * expected violation is detected
                               */
                              for (var d in response.body.resources[r].drifts) {
                                   if (response.body.resources[r].drifts[d].field == row.split(",")[2]) {
                                        expect(true).to.eq(response.body.resources[r].drifts[d].field == row.split(",")[2])
                                   }
                              }
                         }
                    }
               })
          })
     })
}

/**
 * cleanSlate deletes the environments, policies based belonging to the spec
 * This is required when running BAT in single tenant instances like onprem.accurics.com
 */
function cleanSlate() {
     // Clean up Environments and repositories
     cy.log(`Deleting environments with prefix - ${getSpecBasedNamePrefix()} and associated repositories`)
     cy.request(getEnvs())
     .then((response) => {
          // expect(response.status).to.eq(200)
          let envs = response.body
          if (envs.length === 0) {
               cy.log("No environments to delete")
          }
          else {
               envs.forEach(function (env) {
                    if (env.name.includes(getSpecBasedNamePrefix()) || env.name.includes('Default-')) {
                         cy.log(`Deleting environment: ${env.name}`)
                         cy.request(deleteEnv(env.id))
                    }
               })
          }
     })
     // Clean up orphan repositories
     cy.request(getRepos())
     .then(response => {
          let repos = response.body.repos
          if (repos.length === 0) {
               cy.log("No orphan repos found")
          }
          else {
               repos.forEach(function (repo) {
                    cy.log(`Deleting repository: ${repo.repo}`)
                    cy.request(deleteRepo(repo.repoID))
               })
          }
     })

     //Clean up policy groups with spec prefix
     cy.log(`Deleting Policy Groups with prefix - ${getSpecBasedNamePrefix()}`)
     cy.request(getCustomPolicyGroups())
     .then((policyGroupResponse) => {
          let policyGroups = policyGroupResponse.body
          if (policyGroups.length > 0) {
               policyGroups.forEach(function (policyGroup) {
                    if (policyGroup.name.includes(getSpecBasedNamePrefix())) {
                         // if (policy.policyType.includes("custom")) {
                         cy.log(`Deleting policy: ${policyGroup.name}`)
                         cy.request(deletePolicyGroup(policyGroup.id)) /*.its('status').should('be.equal', 200)*/
                    }
               })
          }
     })

     //Clean up policies with spec prefix
     cy.log(`Deleting policies with prefix - ${getSpecBasedNamePrefix()}`)
     cy.request(getPoliciesV2(`offset=0&limit=200&search=${getSpecBasedNamePrefix()}`))
     .then((policyResponse) => {
          if (policyResponse.body.Rules.length > 0) {
               policyResponse.body.Rules.forEach(function (policyRule) {
                    cy.log(`Deleting policy: ${policyRule.ruleDisplayName}`)
                    cy.request(deletePolicy(policyRule.policyBuilderId))
               })
          }
     })

     // //Clean up Users
     // cy.log(`Deleting Users with prefix - ${getSpecBasedNamePrefix()}`)
     // cy.request(getUsers()).then((userResponse) => {
     //      let users = userResponse.body
     //      if (users.length > 0) {
     //           users.forEach(function (user) {
     //                if (user.email.includes(getSpecBasedNamePrefix().toLowerCase())) {
     //                     cy.log(`Deleting User: ${user.email}`)
     //                     cy.request(deleteUser(user.id))/*.its('status').should('be.equal', 204)*/
     //                }
     //           })
     //      }
     // })

     //Clean up ApiTokens
     cy.log(`Deleting Tokens with prefix - ${getSpecBasedNamePrefix()}`)
     cy.request(getApiTokens())
     .then((response) => {
          let apiTokens = response.body
          if (apiTokens.length > 0) {
               apiTokens.forEach(function (apiToken) {
                    if (apiToken.appName.includes(getSpecBasedNamePrefix())) {
                         cy.log(`Deleting Tokens: ${apiToken.id}`)
                         cy.request(deleteApiToken(apiToken.id))/*.its('status').should('be.equal', 204)*/
                    }
               })
          }
     })

     //Clean up BAT cloud accounts
     cy.log(`Deleting Cloud accounts with prefix - ${getSpecBasedNamePrefix()}`)
     cy.request(getMemberCloudAccounts())
     .then((response) => {
          response.body.forEach((account) => {
               if (account.name.includes(getSpecBasedNamePrefix())) {
                    cy.log(`Deleting Cloud account: ${account.name}`)
                    cy.request(deleteCloudAccount(account.id))
               }
          })
     })

     //Clean up downloads folder
     // cy.exec(`rm -rf ${Cypress.config().downloadsFolder}/*`, { failOnNonZeroExit: false })
}

function getResourceCountForBillingTenant() { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_048') } }

function ignoreUnIgnoreIaCResourceMisconfiguration(envID, violationSlug, reqPayload) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: `${getUrlByName('AU_070')}/${envID}/${violationSlug}/ignore`,
          body: reqPayload
     }
}

function getProjectDetails(envID) {
     /**
    * Returns an object containing all details regarding the envId 
    *
    * @param {string} envID which is the corresponding environmentID
    * @return {Object} envDetails for example {"envId", [repoIDs], policyViolationCount} etc
    */
     let projDetails = {}
     cy.request(getProjects())
     .then((res) => {
          projDetails = res.body.projects.find(element => element.environmentID === envID)
     })
     .then(() => {
          return cy.wrap(projDetails).as("projDetails")
     })
}

function getViolations(envID) {
     return {
          method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_042')}?hasViolation=true&environmentId=${envID}&hasIac=true`
     }
}

function getViolationDetails(envID) {
     /**
    * Returns an object containing envId Violation Details 
    *
    * @param {string} envID which is the corresponding environmentID
    * @return {Object} ViolationDetails for example {resourceCount, [types], ruleID, ruleName} etc
    */
     cy.request(getViolations(envID))
     .then((res) => {
          expect(res.status).to.eq(200)
          let violationDetails = {}
          violationDetails = res.body
          cy.wrap(violationDetails).as("violationDetails")
     })
}

function getMisconfigurationsByCategories() {
     return {
          method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName('AU_044')
     }
}

function getCountOfGlobalResourcesInsights() {
     return {
          method: 'GET',
          headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_043')
     }
}

function ignoreMisconfigurations(reqPayload) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_069'),
          body: reqPayload
     }
}

function getAllFailingPoliciesFromDashboard() {
     return {
          method: 'GET',
          headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_050'),
     }
}

function getTopResourceMisconfigurations() {
     return {
          method: 'GET',
          headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_057'),
     }
}

function getSupportedResourceTypeMap(provider, resType) {
     return {
          method: 'GET',
          headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: `${getUrlByName('AU_070')}?provider=${provider}&type=${resType}`,
     }
}

function getGlobalFilters() {
     return {
          method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_045')
     }
}
function getEnvByID(envID) { return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: `${getUrlByName('AU_047')}/${envID}` } }


function getCloudScanExceptions(groupScanId) {
     /**
    * Returns the list of exceptions when scan is completed with exceptions
    *
    * @param {string} groupScanId which is the corresponding group scan Id
    * @return {Object} Failures for example {cloud scan status, res types, scan Id} etc
    */
     return {
          method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: `${getUrlByName('AU_072')}/${groupScanId}/failures`
     }
}

function getHelmKubescanForProject(body) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_106'),
          body: body,
          encoding: 'binary'
     }
}

function getProjectCloudAccountAssociations(body) {
     return {
          method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
          url: getUrlByName('AU_121'),
          body: body,
          encoding: 'binary'
     }
}


export {
     getGlobalFilters, getSupportedResourceTypeMap, getCloudScanProfiles, getProjects, ignoreUnIgnoreIaCResourceMisconfiguration,
     deleteCloudScanProfile, updateCloudScanProfile, createCloudScanProfile, doCloudScanThroughProfile,
     getFilteredViolations, getResourceCountForBillingTenant, updateCFTConfig, getAzMgmtGroups,
     getSubscriptions, getAzureResourceGroups, verifyDrifts, verifyViolations, verifyAWSResourceMapping,
     verifyAzureResourceMapping, cleanSlate, getSnapshotStats, getEnvs,
     deleteEnv, doCloudScan, getAWSVPCs, doIaCScan, createEnv, updateEnv, getAllFailingPoliciesFromDashboard,
     getCloudScanStatus, getApiTokens, waitForCloudScanToFinish, getProjectPRs, getK8sClusters,
     getProjectCloudProvider, getProjectDetails, createProjectWithDefaultPolicies, getViolationDetails,
     getMisconfigurationsByCategories, getCountOfGlobalResourcesInsights, ignoreMisconfigurations,
     cancelCloudScanByGroupId, getTopResourceMisconfigurations, getEnvByID, getCloudScanExceptions,
     getHelmKubescanForProject, getProjectCloudAccountAssociations, getResourcesByProjectId
}