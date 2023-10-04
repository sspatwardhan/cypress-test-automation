import { createCloudScanProfile, doCloudScanThroughProfile, updateEnv, waitForCloudScanToFinish, getCloudScanStatus } from '../../../requests/projects'
import { getGlobalResourcesData, onboardReposThroughProject } from '../../../requests/repositoriesAndResources'
import { initAPISpecRoutine, _threeSeconds, _tenSeconds, _sixtySeconds, _fifteenSeconds, _twentySeconds, getSpecBasedNamePrefix } from '../../../support/utils'
import { getPoliciesV2 } from '../../../requests/policy-groups-and-policies'

const dayjs = require('dayjs')

let advancePolicies;
const cloudProvider = 'azure'
describe(`${cloudProvider} - Supported resource resource types validation`, () => {
  before(() => {
    initAPISpecRoutine('before');
    cy.fixture(`advance-policies-${cloudProvider}.json`).then((advPolicyData) => { advancePolicies = advPolicyData;})
  })
  after(() => initAPISpecRoutine('after'))
  let resTypesPerScanProfile = ["app_service","security_center_contact","app_service_environment","container_group","container_registry","function_app","image","kubernetes_cluster","monitor_autoscale_setting","virtual_machine_scale_set","virtual_machine","iothub","iothub_dps","analysis","databricks_workspace","eventhub","servicebus_namespace","cosmosdb_account","disk","mssql_virtual_machine","mariadb_server","mysql_server","postgresql_server","snapshot","storage_account","mssql_server","storage_container","mysql_flexible_server","availability_set","disk_encryption_set","monitor_action_group","monitor_activity_log_alert","monitor_log_profile","network_watcher","resource_group","security_center_subscription_pricing","monitor_diagnostic_setting","application_gateway","express_route_circuit","express_route_gateway","firewall","frontdoor","lb","local_network_gateway","nat_gateway","network_ddos_protection_plan","network_interface","network_profile","network_security_group","point_to_site_vpn_gateway","private_endpoint","private_link_service","proximity_placement_group","public_ip","public_ip_prefix","route_table","virtual_network","virtual_network_gateway","virtual_network_gateway_connection","virtual_wan","vpn_gateway","vpn_server_configuration","application_security_group","bastion_host","key_vault","role_definition","iot_security_solution"]
  //assumed adv. policy res_types: ["app_service","container_group","container_registry","kubernetes_cluster","monitor_autoscale_setting","virtual_machine_scale_set","virtual_machine","iothub","iothub_dps","cosmosdb_account","mssql_virtual_machine","mysql_server","postgresql_server","mssql_server","storage_container","mysql_flexible_server","monitor_action_group","monitor_activity_log_alert","monitor_log_profile","resource_group","security_center_subscription_pricing","monitor_diagnostic_setting","firewall","network_interface","network_security_group","virtual_network","key_vault"]
  const store = {
    envName: getSpecBasedNamePrefix() + Date.now(),
    tfEquivalentResTypesToValidate: []
  }
  
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it(`${cloudProvider} - Create project, associate repos and clod account to it`, () => {
    onboardReposThroughProject({
      envs: [{ name: store.envName, provider: "azure", botIds: [] }],
      repos: [
        { provider: "azure", url: `https://tcs-qe-org1@dev.azure.com/tcs-qe-org1/test-project1/_git/${Cypress.env("bitbucketBATRepo1az")}`, name: `acqa-repo9-azure-tf12_${new Date().getTime()}`, engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_az_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", autoRemediate: "none", source: `tcs-qe-org1/${Cypress.env("bitbucketBATRepo1az")}-azRepo` }]
    })
    cy.get('@envDetails').then((response) => {
      store.envID = response[0]
      store.azRepo1ID = response[1]
    })
    .then(associateCloudAccountToProject => {
      cy.request(updateEnv({ "id": store.envID, "cloudAccountID": { [Cypress.env('cloudAccountIDs').azure_9c8988b4_d223_45a9_a7f2_e7b71c7a0ed6]: {} } }))
      .then(response => {
        expect(response.status).to.eq(204)
      })
    })
  })


  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it(`${cloudProvider} - Run cloud scan and go on pouring discovered resources in project`, () => {
    // Create cloud scan profile with target resources
    cy.request(createCloudScanProfile(store.envID, { is_default: false, name: store.envName + '_all_res', options: { resource_types: resTypesPerScanProfile, "vm_assess_opts": [] } }))
    .then(response => {
      store.csProfileID = response.body.profile_id
    })
    .then(runCloudScan => {
      // Run cloud scan
      cy.request(doCloudScanThroughProfile(store.envID, store.csProfileID)).then(response => {
        expect(response.status).to.eq(202)
        waitForCloudScanToFinish(store.envID, store.envName)
        // Make sure the cloud scan was successful (optional)
        cy.request(getCloudScanStatus(store.envID)).then((csResponse) => {
          expect(csResponse.body[0].cloud_scan_summary.scan_status).to.be.oneOf(["Successful","Completed with errors"])
        })
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it(`${cloudProvider} - Validate advance policy evaluation`, () => {
    const expectedResTypeToMisconfigs = {};
    let allRuleViolations;
    const resFilterSlug=`environmentId=${store.envID}&hasCloud=false&hasIac=true`
    cy.log('Generating resource type vs misconfigs data..')
    .then(pivotingAdvPolicyJsOnOnResTypes =>{
      for (const item of advancePolicies) {
        const resource = item['main-resource'];
        const ruleName = item['ruleName'];
        if (!expectedResTypeToMisconfigs[resource]) {
          expectedResTypeToMisconfigs[resource] = [];
        }
        expectedResTypeToMisconfigs[resource].push(ruleName);
      }
    })
    .then(getMisconfigDescription => {
      // Get all ruleViolations to populate ruleDisplayName in the report later
      cy.request(getPoliciesV2(`offset=0&limit=800&provider=${cloudProvider}`)).then(response => {
        allRuleViolations = response.body.Rules
      })
    })
    .then(validate => {
      cy.log(expectedResTypeToMisconfigs)
      const testSite = Cypress.config().baseUrl.split('.')[0].replace("https://","");
      const advPolicyEval_ResourcesWithExpectedMisconfigsReport = `${cloudProvider}_AdvPolicyEval_ResourcesWithExpectedMisconfigs_${testSite}_${dayjs().format('DD-MM-YYYY')}.csv`
      const advPolicyEval_ResourcesWithoutExpectedMisconfigsReport = `${cloudProvider}_AdvPolicyEval_ResourcesWithoutExpectedMisconfigs_${testSite}_${dayjs().format('DD-MM-YYYY')}.csv`
      const advPolicyEval_ResourcesWithoutMisconfigsReport = `${cloudProvider}_AdvPolicyEval_ResourcesWithoutMisconfigs_${testSite}_${dayjs().format('DD-MM-YYYY')}.csv`
      const advPolicyEval_resourceTypesNotDiscoveredInCloudReport = `${cloudProvider}_AdvPolicyEval_resourceTypesNotDiscoveredInCloud_${testSite}_${dayjs().format('DD-MM-YYYY')}.csv`
      
      // Create empty report files with headers
      const downloadsFolder = Cypress.config().downloadsFolder
      cy.writeFile(downloadsFolder + '/' + advPolicyEval_ResourcesWithExpectedMisconfigsReport,'res_type,resource_name,misconfig\n')
      cy.writeFile(downloadsFolder + '/' + advPolicyEval_ResourcesWithoutExpectedMisconfigsReport,'res_type,resource_name,misconfig,misconfig_description\n')
      cy.writeFile(downloadsFolder + '/' + advPolicyEval_ResourcesWithoutMisconfigsReport,'res_type,resource_name\n')
      cy.writeFile(downloadsFolder + '/' + advPolicyEval_resourceTypesNotDiscoveredInCloudReport,'res_type\n')
      
      // for every target resource_type in the processed json
      Object.keys(expectedResTypeToMisconfigs).forEach(targetResType => {
        // start actual validation
        let queryString = `useBaseline=true&limit=100&offset=0&type=${targetResType}&${resFilterSlug}`
        cy.request(getGlobalResourcesData(queryString))
        .then(resTypeResp => {
          if(resTypeResp.body.count > 0){
            // for every misconfigration under the targetResType
            expectedResTypeToMisconfigs[targetResType].forEach(expectedMisconfig => {
              cy.log(`Finding ${expectedMisconfig} in ${targetResType}`)
              // find the misconfiguration under the resource
              for (let singleResourceJson of resTypeResp.body.resources) {
                let resource_name = (singleResourceJson.cloudId + singleResourceJson.iacId).replace('undefined','')
                if (hasKeyValuePair(singleResourceJson, 'name', expectedMisconfig)) {
                  cy.writeFile(downloadsFolder + '/' + advPolicyEval_ResourcesWithExpectedMisconfigsReport,`${targetResType},${resource_name},${expectedMisconfig}\n`, { flag: 'a+' })                  
                  return // and go for next misconfiguration
                }
                else {
                  let ruleDisplayName = allRuleViolations.find(rule => rule.ruleName === expectedMisconfig) == undefined ? "couldn't find rule" : allRuleViolations.find(rule => rule.ruleName === expectedMisconfig).ruleDisplayName
                  cy.writeFile(downloadsFolder + '/' + advPolicyEval_ResourcesWithoutExpectedMisconfigsReport,`${targetResType},${resource_name},${expectedMisconfig},${ruleDisplayName}\n`, { flag: 'a+' })
                  // Continue to find the misconfig in the next resource
                }
              }
            })
          }
          else {
            cy.writeFile(downloadsFolder + '/' + advPolicyEval_resourceTypesNotDiscoveredInCloudReport,`${targetResType}\n`, { flag: 'a+' })
          }
        })
      }) 
    })
  })


















})