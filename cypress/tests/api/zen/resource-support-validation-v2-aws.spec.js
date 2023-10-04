import { createCloudScanProfile, doCloudScanThroughProfile, updateEnv, waitForCloudScanToFinish, getCloudScanStatus } from '../../../requests/projects'
import { getGlobalResourcesDataWithTypes, onboardReposThroughProject } from '../../../requests/repositoriesAndResources'
import { initAPISpecRoutine, _threeSeconds, _tenSeconds, _sixtySeconds, _fifteenSeconds, _twentySeconds, getSpecBasedNamePrefix } from '../../../support/utils'
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper'
const dayjs = require('dayjs')
let dataPerResourceSupportSourceOfTruth;
const cloudScanProfilePayload = ["api_gateway","apigatewayv2","mq","sagemaker","ses","sqs","applicationautoscaling","auto_scaling","devicefarm","ec2_instance","ami","elastic_beanstalk","ecr","ecrpublic","ecs","eip","workspaces","lambda","backup","databasemigrationservice","dax","dynamodb","ebs","efs","elasticache","neptune","rds","redshift","s3","qldb","athena","datapipeline","es","iot","firehose","kinesis","kinesisvideo","kinesisanalyticsv2","msk","codebuild","codedeploy","codepipeline","cloud9","cloudformation","codecommit","acm","acmpca","configservice","iam","accessanalyzer","aws_db_parameter_group","kms","sg","secretsmanager","waf","securityhub","budgets","cloudwatch","cloudwatchlogs","cloudtrail","organizations","ram","ssm","applicationloadbalancer","appmesh","customer_gateway","transit_gateway","cloudfront","eks","eni","globalaccelerator","igw","nacl","nat","route_table","route53","subnet","vpc","storagegateway","xray"]
describe('AWS - Supported resource resource types validation', () => {
  before(() => {
    initAPISpecRoutine('before');
    cy.fixture(`resource_support.json`).then((x) => { dataPerResourceSupportSourceOfTruth = x})
  })
  after(() => initAPISpecRoutine('after'))

  const cloudProvider = "aws"
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
      cy.log("Diff count: "+ diff1.length )
      cy.log("cmap - resource type diff: restype JSON & CSProfile: "+ diff2)
      cy.log("Diff count: "+ diff2.length)
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it(`${cloudProvider.toUpperCase()} - Create project, associate repos and cloud account to it`, () => {
    console.log(store.resourceTypesToBeValidatedPostScan)
    onboardReposThroughProject({
      envs: [{ name: store.envName, provider: cloudProvider, botIds: [] }],
      repos: [
        { provider: cloudProvider, url: getUrlByName('NAU_016'), name: getUrlByName('NAU_016').replace('https://github.com/tenb-qa/','')+`-${store.envName.toLowerCase()}`, engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "true" }], folderPath: "/", autoRemediate: "none", source: getUrlByName('NAU_016').replace('https://github.com/',''), "folderPath": `${cloudProvider}/resource-support` }]
    })
    cy.get('@envDetails')
    .then((response) => {
      store.envID = response[0]
      store.repoIDs = response[1]
    })
    .then(associateCloudAccountToProject => {
      cy.request(updateEnv({ "id": store.envID, "cloudAccountID": { [Cypress.env('cloudAccountIDs').aws_068347883986]: {} } }))
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