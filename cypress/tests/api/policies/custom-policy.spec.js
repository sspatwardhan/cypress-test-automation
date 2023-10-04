import { updateEnv, getViolationDetails } from '../../../requests/projects';
import { createPolicy, getRegoResourceConfig, testPolicyCondition } from '../../../requests/policy-groups-and-policies';
import { onboardRepoToProject, onboardReposThroughProject, getGlobalResourcesData } from '../../../requests/repositoriesAndResources';
import { initAPISpecRoutine, getSpecBasedNamePrefix, letsWait, _twentySeconds, getPageOffset } from '../../../support/utils';
import { getPoliciesV2 } from '../../../requests/policy-groups-and-policies';
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper';

const name = getSpecBasedNamePrefix();
const store = {
  envName: `${name + Date.now()}`
}

describe('Policies', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))


  /**--------------------------------------------------------
   * Added by: Nitesh
   * Test Management ID: 
  ---------------------------------------------------------*/
  //TODO: Response has been updated of this api will run this TC once this updated
  it.skip('MUST - Get resource by name', () => {
    cy.request(getRegoResourceConfig('aws_accessanalyzer_analyzer')).then(response => {
      expect(response.status).to.eq(200)
      expect(response.body).contains('analyzer_name')
      expect(response.body).contains('arn')
    })
  })

  /**--------------------------------------------------------
     * Added by: Nitesh
     * Test Management ID:
    ---------------------------------------------------------*/
  it('MUST - AWS - Onboard bitbucket repositories to a project', () => {
    cy.request(onboardRepoToProject({
      envs: [{ name: store.envName, provider: "aws", botIds: [] }],
      repos: [
        { provider: "aws", url: getUrlByName("NAU_007"), name: getUrlByName("NAU_007").replace('https://bitbucket.org/tenb-qa/', '') + `-${store.envName.toLowerCase()}`, engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", autoRemediate: "none", source: getUrlByName("NAU_007").replace('tenb-qa/', '') }],
    })).then(response => {
      expect(response.status).to.eq(202)
      expect(response.body[0].id).to.not.be.empty
      store.envID = response.body[0].id
    })
      .then(updateADOEnv => {
        cy.request(updateEnv(
          {
            "id": store.envID, "cloudAccountID": { [Cypress.env('cloudAccountIDs').aws_536274239938]: { vpcId: Cypress.env("awsVPCID"), region: Cypress.env("awsRegion") } }
          }
        )).then(response => {
          expect(response.status).to.eq(204)
        })
      })
  })

  /**--------------------------------------------------------
   * Added by: Nitesh
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - VPE - Test policy condition', () => {
    letsWait("Waiting for the IaC scan to complete...", _twentySeconds)
    cy.request(testPolicyCondition({
      "projectId": store.envID,
      "metadata": {
        "scopes":
          [{
            "conditions": [{ "key": "tags.ACQAResource", "value": "\"true\"", "operator": "equal" },
            { "key": "tags.ACQAResource", "value": "\"true\"", "operator": "endswith" },
            { "key": "name", "value": "", "operator": "notundefined" }],
            "resType": "aws_iam_role"
          },
          {
            "conditions": [{ "key": "tags.Owner", "value": "\"False\"", "operator": "contains" }],
            "resType": "aws_iam_role"
          }]
      }
    }
    )).then(response => {
      expect(response.body).to.deep.equal([
        {
          "inference": "Native",
          "resourceId": "aws_iam_role.acqa-test-iamrole1",
          "source": "IaC",
          "type": "aws_iam_role"
        }
      ])
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - VPE - Create Policy with policy group', () => {
    store.policy_name = `${getSpecBasedNamePrefix() + Date.now() + "-TestPolicy"}`
    store.policyGroup = `${getSpecBasedNamePrefix() + Date.now()}-TestPolicyGroup`
    cy.request(createPolicy({
      "resType": "aws_accessanalyzer_analyzer",
      "name": store.policy_name,
      "remediation": "Tag Correction",
      "severity": "HIGH",
      "category": "Monitoring",
      "benchmark": "GDPR",
      "policyGroup": store.policyGroup,
      "metadata": {
        "scopes": [{
          "conditions": [{ "key": "tags.ACQAResource", "operator": "equal", "value": "\"true\"" },
          { "key": "tags.Name", "operator": "equal", "value": "\"acqa-test-iamaccessanalyzer1\"" }], "resType": "aws_accessanalyzer_analyzer"
        }],
        "remediations": [{ "key": "tags.ACQAResource", "type": "edit", "value": "\"Yes\"" }]
      }
    }))
      .then(response => {
        expect(response.status).to.eq(200)
        store.policy_id = response.body
      })


  })

  /**--------------------------------------------------------
  * Added by: Raja
  * Test Management ID: getCustomPolicyRegoInfo
 ---------------------------------------------------------*/
  it('MUST - VPE - Get custom policy rego information with policy group', () => {
    const qs = `offset=0&limit=50&search=${store.policy_name}`
    cy.request(getPoliciesV2(qs)).then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.Rules[0].ruleDisplayName).to.eq(store.policy_name)
      expect(response.body.Rules[0].ruleTemplate).to.include('input.aws_accessanalyzer_analyzer[_]')
      expect(response.body.Rules[0].resourceType).to.eq("Accessanalyzer Analyzer")
      expect(response.body.Rules[0].remediation).to.eq("Tag Correction")
      expect(response.body.Rules[0].severity).to.eq("HIGH")
      expect(response.body.Rules[0].category).to.eq("Monitoring")
    })
  })

  /**--------------------------------------------------------
  * Added by: Raja
  * Test Management ID:
 ---------------------------------------------------------*/
  it('MUST - VPE - Create Policy without policy group', () => {
    store.policy_name_without_policy_group = `${getSpecBasedNamePrefix() + Date.now() + "-TestPolicy"}`
    cy.request(createPolicy({
      "resType": "aws_instance",
      "name": store.policy_name_without_policy_group,
      "remediation": "Tag Correction",
      "severity": "HIGH",
      "category": "Monitoring",
      "benchmark": "GDPR",
      "metadata": {
        "scopes": [{
          "conditions": [{ "key": "tags.ACQAResource", "operator": "equal", "value": "\"true\"" },
          { "key": "tags.Name", "operator": "equal", "value": "\"aws_instance1\"" }], "resType": "aws_instance"
        }],
        "remediations": [{ "key": "tags.ACQAResource", "type": "edit", "value": "\"Yes\"" }]
      }
    }))
      .then(response => {
        expect(response.status).to.eq(200)
        store.policy_id_without_policy_group = response.body
      })


  })

  /**--------------------------------------------------------
  * Added by: Raja
  * Test Management ID: getCustomPolicyRegoInfo
 ---------------------------------------------------------*/
  it('MUST - VPE - Get custom policy rego information without policy group', () => {
    const qs = `offset=0&limit=50&search=${store.policy_name_without_policy_group}`
    cy.request(getPoliciesV2(qs)).then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.Rules[0].ruleDisplayName).to.eq(store.policy_name_without_policy_group)
      expect(response.body.Rules[0].ruleTemplate).to.include('input.aws_instance[_]')
      expect(response.body.Rules[0].resourceType).to.eq("Instance")
      expect(response.body.Rules[0].remediation).to.eq("Tag Correction")
      expect(response.body.Rules[0].severity).to.eq("HIGH")
      expect(response.body.Rules[0].category).to.eq("Monitoring")
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - VPE - Update policy data - validate updating without benchmark and policy group ', () => {
    cy.request(createPolicy({
      "resType": "aws_accessanalyzer_analyzer",
      "name": `${getSpecBasedNamePrefix() + Date.now() + "-TestPolicy"}`,
      "remediation": "Tag Correction",
      "severity": "HIGH",
      "category": "Monitoring",
      "benchmark": "",
      "policyGroup": "",
      "metadata": {
        "scopes": [{
          "conditions": [{ "key": "tags.Name", "operator": "contains", "value": "\"acqa\"" }],
          "resType": "aws_accessanalyzer_analyzer"
        }],
        "remediations": [{ "key": "tags.Name", "type": "edit", "value": "\"tested\"" }]
      }
    }))
      .then(response => {
        expect(response.status).to.eq(200)
      })
  })

  /**--------------------------------------------------------
       * Added by: ysahu
       * Test Management ID:
      ---------------------------------------------------------*/
  it('MUST - Verify the count of impacted resources from findings page with failed resources in policy page and total misconfiguration using multiple filters', () => {
    let queryString;
    onboardReposThroughProject({
      envs: [{ name: store.envName + "test_count_for_impacted_resource_and_filter_validation", provider: "aws", botIds: [] }],
      repos: [
        { provider: "aws", url: getUrlByName("NAU_007"), name: getUrlByName("NAU_007").replace('https://bitbucket.org/tenb-qa/', '') + `-${store.envName.toLowerCase()}`, engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", autoRemediate: "none", source: getUrlByName("NAU_007").replace('https://bitbucket.org/', '') }],
    })
    cy.get('@envDetails').then((response) => {
      store.envID = response[0]
    })
      .then(() => {
        getViolationDetails(store.envID)
        cy.get('@violationDetails').then((res) => {
          store.impactedResourceCount = res.types[0].iacViolations;
          store.ruleName = res.types[0].name;
          store.totalMisconfigurations = res.types.length;
        })
      })
      .then(() => {
        queryString = `offset=0&limit=10&name=${store.ruleName}&ruleStatus=NONCOMPLIANT`;
        cy.request(getPoliciesV2(queryString)).then((res) => {
          expect(res.status).to.eq(200)
          store.failedResouceCount = res.body.Rules[0].failedCount;
          expect(store.impactedResourceCount).to?.be?.lte(store.failedResouceCount)
          // Verifing the count of impacted resources from findings page with failed resources in policy page pertaining to a particular envID
        })
      })
      .then(() => {
        queryString = `offset=0&limit=10&ruleStatus=NONCOMPLIANT`;
        cy.request(getPoliciesV2(queryString)).then((res) => {
          expect(res.status).to.eq(200)
          store.ruleViolationCount = res.body.TotalEligibleRules;
          expect(store.ruleViolationCount).to.be.above(0)
          expect(store.totalMisconfigurations).to.be.lte(store.ruleViolationCount)
          // Count of total misconfiguration pertaining to a envID must be lte total non-complaint rules in policy page
        })
      })
      // Just using different filters
      .then(() => {
        queryString = `offset=0&limit=10&provider=aws&ruleStatus=NONCOMPLIANT`;
        cy.request(getPoliciesV2(queryString)).then((res) => {
          expect(res.status).to.eq(200)
          store.ruleViolationCount = res.body.TotalEligibleRules;
          expect(store.ruleViolationCount).to.be.gte(0)
        })
      })
      .then(() => {
        queryString = `offset=0&limit=10&provider=aws&severity=Medium&ruleStatus=NONCOMPLIANT`;
        cy.request(getPoliciesV2(queryString)).then((res) => {
          expect(res.status).to.eq(200)
          store.ruleViolationCount = res.body.TotalEligibleRules;
          expect(store.ruleViolationCount).to.be.gte(0)
        })
      })
  })


  /**--------------------------------------------------------
       * Added by: ysahu
       * Test Management ID:
      ---------------------------------------------------------*/
  it('MUST - Verify if api is returning paginated data for most of pages', () => {
    store.offset = 0;
    store.limit = 10 // to be set by the user;
    let queryString = `offset=${store.offset}&limit=10&severity=High`;
    // Checks for validation in first page 
    cy.request(getPoliciesV2(queryString)).then((res) => {
      expect(res.status).to.eq(200)
      store.totalRuleCount = res.body.TotalEligibleRules;
      store.firstPageRuleCount = (store.totalRuleCount < store.limit ? store.totalRuleCount % store.limit : store.limit);
      expect(store.totalRuleCount).to.be.above(0)
      //function to get Rule Count page details
      store.totalCount = store.totalRuleCount;
      getPageOffset(store);
      expect(res.body.Rules.length).to.eq(store.firstPageRuleCount)
    })
      // Checks for validation in last page 
      .then(() => {
        queryString = `offset=${store.offset}&limit=10&severity=High`;
        cy.request(getPoliciesV2(queryString)).then((res) => {
          expect(res.status).to.eq(200)
          let lastPageRuleCount = store.totalRuleCount - store.offset;
          expect(res.body.Rules.length).to.eq(lastPageRuleCount)
        })
      })
  })

  /**--------------------------------------------------------
       * Added by: ysahu
       * Test Management ID:
      ---------------------------------------------------------*/
  it('MUST - Verify count of failed resources in policy page and impacted resources in flyout in first and last page', () => {
    let queryString = `offset=0&limit=10&severity=High&ruleStatus=NONCOMPLIANT`;
    store.limit = 10 // to be set by the user;

    // Checks for validation in first page 
    cy.request(getPoliciesV2(queryString)).then((res) => {
      expect(res.status).to.eq(200)
      store.failedResouceCountForFirstPolicy = res.body.Rules[0].failedCount;
      store.ruleNameForFirstPolicy = res.body.Rules[0].ruleName;
      expect(store.failedResouceCountForFirstPolicy).to.be.above(0)
      store.totalCount = res.body.TotalEligibleRules;
      getPageOffset(store)
    })
      .then(() => {
        queryString = `ruleName=${store.ruleNameForFirstPolicy}&offset=0&limit=10`
        cy.request(getGlobalResourcesData(queryString)).then((res) => {
          expect(res.status).to.eq(200)
          let impactedResourcesCountFromFlyout = res.body.count;
          expect(store.failedResouceCountForFirstPolicy).to.eq(impactedResourcesCountFromFlyout)
        })
      })
      // Checks for validation in last page 
      .then(() => {
        queryString = `offset=${store.offset}&limit=10&severity=High&ruleStatus=NONCOMPLIANT`;
        cy.request(getPoliciesV2(queryString)).then((res) => {
          expect(res.status).to.eq(200)
          store.failedResouceCountForFirstPolicy = res.body.Rules[0].failedCount;
          store.ruleNameForFirstPolicy = res.body.Rules[0].ruleName;
          expect(store.failedResouceCountForFirstPolicy).to.be.above(0)
        })
      })
      .then(() => {
        queryString = `ruleName=${store.ruleNameForFirstPolicy}&offset=0&limit=10`
        cy.request(getGlobalResourcesData(queryString)).then((res) => {
          expect(res.status).to.eq(200)
          let impactedResourcesCountFromFlyout = res.body.count;
          expect(store.failedResouceCountForFirstPolicy).to.eq(impactedResourcesCountFromFlyout)
        })
      })
  })
})