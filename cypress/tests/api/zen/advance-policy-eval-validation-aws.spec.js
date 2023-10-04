import { createCloudScanProfile, doCloudScanThroughProfile, updateEnv, waitForCloudScanToFinish, getCloudScanStatus } from '../../../requests/projects'
import { getGlobalResourcesData, onboardReposThroughProject } from '../../../requests/repositoriesAndResources'
import { hasKeyValuePair, initAPISpecRoutine, _threeSeconds, _tenSeconds, _sixtySeconds, _fifteenSeconds, _twentySeconds, letsWait, getSpecBasedNamePrefix } from '../../../support/utils'
import { getPoliciesV2 } from '../../../requests/policy-groups-and-policies'
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper';

const dayjs = require('dayjs')

let advancePolicies;
const cloudProvider = 'aws'
describe(`${cloudProvider} - Supported resource resource types validation`, () => {
  before(() => {
    initAPISpecRoutine('before');
    cy.fixture(`advance-policies-${cloudProvider}-current.json`).then((advPolicyData) => { advancePolicies = advPolicyData;})
  })
  after(() => initAPISpecRoutine('after'))
  let resTypesPerScanProfile = ["api_gateway","apigatewayv2","mq","sagemaker","ses","sns","sqs","applicationautoscaling","auto_scaling","devicefarm","ec2_instance","ami","elastic_beanstalk","ecr","ecrpublic","ecs","eip","workspaces","lambda","backup","databasemigrationservice","dax","dynamodb","ebs","efs","elasticache","neptune","rds","redshift","s3","athena","datapipeline","es","iot","firehose","kinesis","kinesisvideo","kinesisanalyticsv2","msk","codebuild","codedeploy","codepipeline","cloud9","cloudformation","codecommit","acm","acmpca","configservice","iam","accessanalyzer","aws_db_parameter_group","kms","sg","secretsmanager","waf","securityhub","budgets","cloudwatch","cloudwatchlogs","cloudtrail","organizations","ram","ssm","applicationloadbalancer","appmesh","customer_gateway","transit_gateway","classicloadbalancer","cloudfront","eks","eni","gatewayloadbalancer","globalaccelerator","igw","nacl","nat","networkloadbalancer","route_table","route53","subnet","vpc","storagegateway","xray"]
  // assumed adv. policy res_types: ["api_gateway","apigatewayv2","mq","auto_scaling","ec2_instance","ecr","ecrpublic","lambda","ebs","efs","rds","s3","codepipeline","codecommit","iam","accessanalyzer","sg","securityhub","cloudtrail","customer_gateway","transit_gateway","eni","gatewayloadbalancer","igw","nacl","nat","networkloadbalancer","route_table","route53","vpc","storagegateway"]
  const store = {
    envName: getSpecBasedNamePrefix() + Date.now(),
    tfEquivalentResTypesToValidate: []
  }

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it(`${cloudProvider} - Create project, associate repos and cloud account to it`, () => {
    onboardReposThroughProject({
      envs: [{ name: store.envName, provider: "aws", botIds: [] }],
      repos: [
        { provider: "aws", url: getUrlByName('NAU_007'), name: getUrlByName('NAU_007').replace('https://bitbucket.org/tenb-qa/','')+`-${store.envName.toLowerCase()}`, engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", autoRemediate: "none", source: getUrlByName('NAU_007').replace('https://bitbucket.org/','') }]
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