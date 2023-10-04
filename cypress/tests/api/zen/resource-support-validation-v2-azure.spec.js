import { createCloudScanProfile, doCloudScanThroughProfile, updateEnv, waitForCloudScanToFinish, getCloudScanStatus } from '../../../requests/projects'
import { getGlobalResourcesDataWithTypes, onboardReposThroughProject } from '../../../requests/repositoriesAndResources'
import { initAPISpecRoutine, _threeSeconds, _tenSeconds, _sixtySeconds, _fifteenSeconds, _twentySeconds, getSpecBasedNamePrefix } from '../../../support/utils'
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper'

const dayjs = require('dayjs')
let dataPerResourceSupportSourceOfTruth;
const cloudScanProfilePayload = ["app_service","security_center_contact","app_service_environment","container_group","container_registry","function_app","image","kubernetes_cluster","monitor_autoscale_setting","virtual_machine_scale_set","virtual_machine","iothub","iothub_dps","analysis","databricks_workspace","eventhub","servicebus_namespace","cosmosdb_account","disk","mssql_virtual_machine","mariadb_server","mysql_server","postgresql_server","snapshot","storage_account","mssql_server","storage_container","mysql_flexible_server","availability_set","disk_encryption_set","monitor_action_group","monitor_activity_log_alert","monitor_log_profile","network_watcher","resource_group","security_center_subscription_pricing","monitor_diagnostic_setting","application_gateway","express_route_circuit","express_route_gateway","firewall","frontdoor","lb","local_network_gateway","nat_gateway","network_ddos_protection_plan","network_interface","network_profile","network_security_group","point_to_site_vpn_gateway","private_endpoint","private_link_service","proximity_placement_group","public_ip","public_ip_prefix","route_table","virtual_network","virtual_network_gateway","virtual_network_gateway_connection","virtual_wan","vpn_gateway","vpn_server_configuration","application_security_group","bastion_host","key_vault","role_definition","iot_security_solution"]
describe('AZURE - Supported resource resource types validation', () => {
  before(() => {
    initAPISpecRoutine('before');
    cy.fixture(`resource_support.json`).then((x) => { dataPerResourceSupportSourceOfTruth = x})
  })
  after(() => initAPISpecRoutine('after'))

  const cloudProvider = "azure"
  const store = {
    envName: getSpecBasedNamePrefix() + Date.now()
  }

/**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it(`${cloudProvider.toUpperCase()} - Create list resource types to be scanned`, () => {
    cy.log('Preparing required data..')
    .then(()=>{
      store.resourceTypesToBeValidatedPostScan = [...new Set(dataPerResourceSupportSourceOfTruth
        .filter(item => item.provider === cloudProvider.toUpperCase() && item.terraformer_category != "" && item.cmap_category != "")
        .map(item => item.resource_type)
      )];
      store.tferSuportedResTypesAsPerBackend = [...new Set(dataPerResourceSupportSourceOfTruth
        .filter(item => item.provider === cloudProvider.toUpperCase() && item.terraformer_category != "")
        .map(item => item.terraformer_category)
      )];
      store.cmapSuportedResTypesAsPerBackend = [...new Set(dataPerResourceSupportSourceOfTruth
        .filter(item => item.provider === cloudProvider.toUpperCase() && item.cmap_category != "")
        .map(item => item.cmap_category)
      )];
    })
    .then(logDiffs => {
      // Log the diff. between res_types(harvestor json - cloudscan profile)
      const diff1 = store.tferSuportedResTypesAsPerBackend.filter(item => !cloudScanProfilePayload.includes(item))
      const diff2 = store.cmapSuportedResTypesAsPerBackend.filter(item => !cloudScanProfilePayload.includes(item))
      cy.log("tfer - resource type diff: restype JSON & CSProfile: "+ diff1)
      cy.log("Diff count: "+ diff1.length)
      cy.log("cmap - resource type diff: restype JSON & CSProfile: "+ diff2)
      cy.log("Diff count: "+ diff2.length)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it(`${cloudProvider.toUpperCase()} - Create project, associate repos and cloud accounts to it`, () => {
    onboardReposThroughProject({
      envs: [{ name: store.envName, provider: cloudProvider, botIds: [] }],
      repos: [
        { provider: cloudProvider, url: getUrlByName('NAU_016'), name: getUrlByName('NAU_016').replace('https://github.com/tenb-qa/','')+`-${store.envName.toLowerCase()}`, engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "true" }], folderPath: "/", autoRemediate: "none", source: getUrlByName('NAU_016').replace('https://github.com/',''), "folderPath": `${cloudProvider}/main/resource-support` }]
    })
    cy.get('@envDetails')
    .then((response) => {
      store.envID = response[0]
      store.repoIDs = response[1]
    })
    .then(associateCloudAccountToProject => {
      cy.request(updateEnv({ "id": store.envID, "cloudAccountID": {[Cypress.env('cloudAccountIDs').azure_9c8988b4_d223_45a9_a7f2_e7b71c7a0ed6]:{}}}))
      .then(response => {
        expect(response.status).to.eq(204)
      })
    })
  })


  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it(`${cloudProvider.toUpperCase()} - Run cloud scan with all resource types`, () => {
    // Create cloud scan profile with target resources
    cy.request(createCloudScanProfile(store.envID, { is_default: false, name: store.envName + '_all_res', options: { resource_types: cloudScanProfilePayload, "vm_assess_opts": [] } }))
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
  it(`${cloudProvider.toUpperCase()} - Validate resource support through cloud scan`, () => {
    const testSite = Cypress.config().baseUrl.split('.')[0].replace("https://","");
    const resourceTypesDiscoveredInCloud = `${cloudProvider}_res_types_discovered_in_cloud_${testSite}_${dayjs().format('DD-MM-YYYY')}.csv`
    const resourceTypesNotDiscoveredInCloud = `${cloudProvider}_res_types_not_discovered_in_cloud_${testSite}_${dayjs().format('DD-MM-YYYY')}.csv`
    
    // Create empty report files with headers
    const downloadsFolder = Cypress.config().downloadsFolder
    cy.writeFile(downloadsFolder + '/' + resourceTypesDiscoveredInCloud,'res_type,count\n')
    cy.writeFile(downloadsFolder + '/' + resourceTypesNotDiscoveredInCloud,'res_type\n')

    cy.log('Starting to verify resource types discovered by cloud scan')
    .then(verifyDiscoveredResourceTypes => {
      const queryString = `useBaseline=true&environmentId=${store.envID}&hasCloud=true`
      cy.request(getGlobalResourcesDataWithTypes(queryString)).then(cloudResResp => {
        expect(cloudResResp.status).to.eq(200)
        // Validate
        store.resourceTypesToBeValidatedPostScan.forEach(resTypeToValidate => {
          // if resource type found
          if(cloudResResp.body.types.find(discoveredResTypes => discoveredResTypes.type === resTypeToValidate)){
            cy.log("Successfully discovered res_type: " + resTypeToValidate)
            let resTypeResCount = cloudResResp.body.types.find(discoveredResTypes => discoveredResTypes.type === resTypeToValidate).count
            cy.writeFile(downloadsFolder + '/' + resourceTypesDiscoveredInCloud,`${resTypeToValidate},${resTypeResCount}\n`, { flag: 'a+' })
          }
          else {
            cy.log("Couldn't discover res_type: " + resTypeToValidate)
            cy.writeFile(downloadsFolder + '/' + resourceTypesNotDiscoveredInCloud,`${resTypeToValidate}\n`, { flag: 'a+' })
          }
        })
      })
    })
  })
















})