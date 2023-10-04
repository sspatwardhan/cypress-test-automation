import {
    createProjectWithDefaultPolicies, updateEnv,
    createCloudScanProfile, doCloudScanThroughProfile, waitForCloudScanToFinish, getFilteredViolations, getCloudScanStatus
} from '../../../requests/projects'
import {
    getComplianceCategoryDetails, getFilteredRuleCountForCompliance, getFilteredResourceFailingPoliciesCount,
    getChartsDetailsForCompliance, gettotalRuleCountForCompliance, verifyFilterComplianceForOnlyCloudProviders, getComplianceDataForProjectAndProvider, getComplianceDataForRepoandCloudAccount, verifyFilterComplianceData
} from '../../../requests/compliance'
import { onboardReposThroughProject, getGlobalResourcesData } from '../../../requests/repositoriesAndResources'
import { getSpecBasedNamePrefix, _sixtySeconds, _threeSeconds, _fifteenSeconds, getPageOffset, initAPISpecRoutine, generateRandomNumber } from '../../../support/utils'
import { getPoliciesV2 } from '../../../requests/policy-groups-and-policies'
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper';

const name = getSpecBasedNamePrefix();
var queryString = "";
let azureAccountID = "9c8988b4-d223-45a9-a7f2-e7b71c7a0ed6";
let awsAccountID = "536274239938";

const store = {
    envName: `${name + Date.now()}`
}

const benchMarkNames = ["NIST-800-53", "NIST-CSF", "NY-DFS", "CIS-1.2", "CIS-1.3", "CIS-1.4", "CCM", "ISO-27001"]

describe('Verify Compliance Reports', () => {
    before(() => initAPISpecRoutine('before'))

    /**--------------------------------------------------------
      * Added by: tlikhar
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Validate project filter on compliance reports page', () => {
        onboardReposThroughProject({
            envs: [{ name: store.envName + "_1", provider: "aws", botIds: [] }],
            repos: [
                {
                    provider: "aws", url: getUrlByName("NAU_007"),
                    name: getUrlByName("NAU_007").replace('https://bitbucket.org/tenb-qa/', '')+"-"+`${store.envName.toLowerCase()}`,
                    engineType: "terraform", config: [{
                        key: "TERRAFORM_VERSION",
                        value: Cypress.env("tf_version_for_aws_repos")
                    },
                    { key: "TERRASCAN", value: "false" }], folderPath: "/",
                    autoRemediate: "none", source: getUrlByName("NAU_007").replace('https://bitbucket.org/', '')
                }]
        })

        cy.get('@envDetails').then((response) => {
            store.envID = response[0]
            store.repoIDs = response[1]
        }).then(waitForComplianceData => {
            queryString = `offset=0&limit=5&environmentId=${store.envID}&provider=aws&ruleStatus=failed`
            cy.waitUntil(() => cy.request(getComplianceCategoryDetails(queryString)).then(response => getFilteredRuleCountForCompliance(response.body["categoryDataMap"]) > 20), {
                errorMsg: 'Compliance data is not populated within time.', // overrides the default error message
                timeout: _sixtySeconds,
                interval: _threeSeconds
            });
        })
            .then(getComplianceData => {
                queryString = `offset=0&limit=5&environmentId=${store.envID}&provider=aws&ruleStatus=failed`
                cy.request(getComplianceCategoryDetails(queryString)).then(response => {
                    expect(response.status).to.eq(200)
                    expect(getFilteredRuleCountForCompliance(response.body["categoryDataMap"])).to.be.above(15)
                })
            })
            .then(getCountOfFailingPoliciesForFilteredResources => {
                cy.request(getGlobalResourcesData(`environmentId=${store.envID}&hasIac=true&useBaseline=true&type=aws_s3_bucket&type=aws_instance&type=aws_ebs_volume`))
                    .then((response) => {
                        store.filteredResourceFailingCount = getFilteredResourceFailingPoliciesCount(response.body["resources"])
                    })
            })
            .then(verifyComplianceDataForFilteredResources => {
                queryString = `offset=0&limit=5&environmentId=${store.envID}&provider=aws&ruleStatus=failed&resType=aws_s3_bucket&resType=aws_instance&resType=aws_ebs_volume`
                cy.request(getComplianceCategoryDetails(queryString)).then(response => {
                    expect(response.status).to.eq(200)
                    expect(getFilteredRuleCountForCompliance(response.body["categoryDataMap"])).to.be.above(store.filteredResourceFailingCount)
                })
            })
            .then(verifyComplianceChartsCount => {
                queryString = `&environmentId=${store.envID}&provider=aws`
                cy.request(getChartsDetailsForCompliance(queryString)).then(response => {
                    expect(response.status).to.eq(200)
                    expect(response.body.totalFailedRules).to.be.above(15)
                })
            })
            .then(crossCheckMisconfigurationPageSource => {
                cy.request(getFilteredViolations(undefined, "hasViolation=true&hasIac=true")).then(response => {
                    expect(response.status).to.eq(200)
                    expect(response.body.types.length).to.be.above(10)
                })
            })
            .then(crossCheckMisconfigurationPageSeverity => {
                cy.request(getFilteredViolations(store.envID, "&severity=low&hasIac=true")).then(response => {
                    expect(response.status).to.eq(200)
                    expect(response.body.types.length).to.be.above(5)
                })
            })
    })

    /**--------------------------------------------------------
      * Added by: tlikhar
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Validate repositories filter on compliance reports page', () => {
        onboardReposThroughProject({
            envs: [{ name: store.envName + "_2", provider: "azure", botIds: [] }],
            repos: [
                {
                    provider: "azure", url: getUrlByName("NAU_010"),
                    name: getUrlByName("NAU_010").replace('https://bitbucket.org/tenb-qa/', '')+"-"+`${store.envName.toLowerCase()}`,
                    engineType: "terraform", config: [{
                        key: "TERRAFORM_VERSION",
                        value: Cypress.env("tf_version_for_azure_repos")
                    },
                    { key: "TERRASCAN", value: "true" }], folderPath: "/",
                    autoRemediate: "none", source: getUrlByName("NAU_010").replace('https://bitbucket.org/', ''), webhook: false
                }]
        })

        cy.get('@envDetails').then((response) => {
            store.envID = response[0]
            store.repoIDs = response[1]
        })
            .then(waitForComplianceData => {
                queryString = `offset=0&limit=5&repoId=${store.repoIDs[0]}&provider=azure&ruleStatus=failed`
                cy.waitUntil(() => cy.request(getComplianceCategoryDetails(queryString)).then(response => getFilteredRuleCountForCompliance(response.body["categoryDataMap"]) > 67), {
                    errorMsg: 'Compliance data is not populated within time.', // overrides the default error message
                    timeout: _sixtySeconds,
                    interval: _threeSeconds
                });
            })
            .then(verifyComplianceData => {
                queryString = `offset=0&limit=5&repoId=${store.repoIDs[0]}&provider=azure&ruleStatus=failed`
                cy.request(getComplianceCategoryDetails(queryString)).then(response => {
                    expect(response.status).to.eq(200)
                    expect(getFilteredRuleCountForCompliance(response.body["categoryDataMap"])).to.gte(68)
                })
            })
            .then(getCountOfFailingPoliciesForFilteredResources => {
                cy.request(getGlobalResourcesData(`environmentId=${store.envID}&hasIac=true&useBaseline=true&type=azurerm_resource_group&type=azurerm_kubernetes_cluster`))
                    .then((response) => {
                        store.filteredResourceFailingCount = getFilteredResourceFailingPoliciesCount(response.body["resources"])
                    })
            })
            .then(verifyComplianceDataForFilteredResources => {
                queryString = `offset=0&limit=5&repoId=${store.repoIDs[0]}&provider=azure&ruleStatus=failed&resType=azurerm_resource_group&resType=azurerm_kubernetes_cluster`
                cy.request(getComplianceCategoryDetails(queryString)).then(response => {
                    expect(response.status).to.eq(200)
                    expect(getFilteredRuleCountForCompliance(response.body["categoryDataMap"])).to.be.above(store.filteredResourceFailingCount)
                })
            })
            .then(verifyComplianceChartsCount => {
                queryString = `&repoId=${store.repoIDs[0]}&provider=azure`
                cy.request(getChartsDetailsForCompliance(queryString)).then(response => {
                    expect(response.status).to.eq(200)
                    expect(response.body["totalFailedRules"]).to.gte(68)
                })
            })
            .then(crossCheckMisconfigurationPageRepository => {
                cy.request(getFilteredViolations(undefined, `hasViolation=true&repoId=${store.repoIDs[0]}`)).then(response => {
                    expect(response.status).to.eq(200)
                    expect(response.body.types.length).to.gte(68)
                })
            })
    })

    /**--------------------------------------------------------
      * Added by: tlikhar
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Validate cloud account filter on compliance reports page', () => {
        createProjectWithDefaultPolicies(store.envName + "_3", "azure")
        cy.get("@createProjectWithDefaultPolicy_ID").then((response) => {
            store.envID = response
        })
            .then(updateEnvWithProject => {
                cy.request(updateEnv(
                    {
                        "id": store.envID,
                        "cloudAccountID": {
                            [Cypress.env('cloudAccountIDs').azure_9c8988b4_d223_45a9_a7f2_e7b71c7a0ed6]: {
                                "resourceGroups": [Cypress.env("azResourceGroupName")]
                            }
                        }
                    }
                )).then(response => {
                    expect(response.status).to.eq(204)
                })
            })
            .then(triggerCloudScan => {
                cy.request(createCloudScanProfile(store.envID, { is_default: false, name: store.envName, options: { resource_types: Cypress.env("azureCloudResourcesToBeScannedWithProfile"), "vm_assess_opts": [] } }))
                    .then(response => {
                        store.csProfileID = response.body.profile_id
                    }).then(runCloudScan => {
                        // Run cloud scan
                        cy.request(doCloudScanThroughProfile(store.envID, store.csProfileID)).then(response => {
                            expect(response.status).to.eq(202)
                            waitForCloudScanToFinish(store.envID, store.envName)
                        })
                        cy.request(getCloudScanStatus(store.envID)).then((csResponse) => {
                            expect(csResponse.body[0].cloud_scan_summary.scan_status).to.be.oneOf(["Successful", "Completed with errors"])
                        })
                    })
            })
            .then(waitForComplianceData => {
                queryString = `offset=0&limit=5&cloudAccount=${azureAccountID}&environmentId=${store.envID}&provider=azure&ruleStatus=failed`
                cy.waitUntil(() => cy.request(getComplianceCategoryDetails(queryString)).then(response => getFilteredRuleCountForCompliance(response.body["categoryDataMap"]) > 1), {
                    errorMsg: 'Compliance data is not populated within time.', // overrides the default error message
                    timeout: _sixtySeconds,
                    interval: _threeSeconds
                });
            })
            .then((verifyViolationsWithMisconfigPage) => {
                let filters = `&hasViolation=true&cft=${azureAccountID}&hasCloud=true`
                cy.request(getFilteredViolations(store.envID, filters)).then(response => {
                    expect(response.status).to.eq(200)
                    store.violationCount = response.body.types.length
                })
            })
            .then(verifyComplianceData => {
                queryString = `offset=0&limit=5&cloudAccount=${azureAccountID}&environmentId=${store.envID}&provider=azure&ruleStatus=failed`
                cy.request(getComplianceCategoryDetails(queryString)).then(response => {
                    expect(response.status).to.eq(200)
                    expect(getFilteredRuleCountForCompliance(response.body["categoryDataMap"])).to.eq(store.violationCount)
                })
            })
            .then(getCountOfFailingPoliciesForFilteredResources => {
                cy.request(getGlobalResourcesData(`environmentId=${store.envID}&hasIac=true&useBaseline=true&type=azurerm_virtual_network&type=azurerm_network_interface`))
                    .then((response) => {
                        store.filteredResourceFailingCount = getFilteredResourceFailingPoliciesCount(response.body["resources"])
                    })
            })
            .then(verifyComplianceDataForFilteredResources => {
                queryString = `offset=0&limit=5&cloudAccount=${azureAccountID}&environmentId=${store.envID}&provider=azure&ruleStatus=failed&resType=azurerm_resource_group&resType=azurerm_network_interface`
                cy.request(getComplianceCategoryDetails(queryString)).then(response => {
                    expect(response.status).to.eq(200)
                    expect(getFilteredRuleCountForCompliance(response.body["categoryDataMap"])).to.be.above(store.filteredResourceFailingCount)
                })
            })
            .then(verifyComplianceChartsCount => {
                queryString = `&cloudAccount=${azureAccountID}&environmentId=${store.envID}&provider=azure`
                cy.request(getChartsDetailsForCompliance(queryString)).then(response => {
                    expect(response.status).to.eq(200)
                    expect(response.body["totalFailedRules"]).to.above(2)
                })
            })
            .then(crossCheckMisconfigurationPageSourceCloud => {
                cy.request(getFilteredViolations(undefined, `hasViolation=true&cft=${azureAccountID}&hasCloud=true`)).then(response => {
                    expect(response.status).to.eq(200)
                    expect(response.body.types.length).to.gte(2)
                })
            })
            .then(crossCheckMisconfigurationPageSourceMapped => {
                cy.request(getFilteredViolations(undefined, `hasViolation=true&environmentId=${store.envID}&mapped=true`)).then(response => {
                    expect(response.status).to.eq(200)
                    expect(response.body.types.length).to.gte(0)
                })
            })
    })
    /**--------------------------------------------------------
      * Added by: tlikhar
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Validate total policy count for benchmark filter on compliance reports page', () => {
        var complianceBenchMarkCounts = {}
        var policyBenchMarkCounts = {}
        benchMarkNames.forEach((benchmark) => {
        queryString = `benchmark=${benchmark}`
        cy.request(getChartsDetailsForCompliance(queryString))
        .then((response) => {
            complianceBenchMarkCounts[benchmark] = response.body["totalRules"]
        })
        .then((getPolicyBenchMarkCounts)=>{
            queryString = `offset=0&limit=50&benchmark=${benchmark}`
            cy.request(getPoliciesV2(queryString))
            .then((response)=>{
                policyBenchMarkCounts[benchmark] = response.body["TotalEligibleRules"]
                expect(complianceBenchMarkCounts).to.deep.equal(policyBenchMarkCounts)
            })
            })
        })
    })

    /**--------------------------------------------------------
      * Added by: rthareja
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Validate the paginated api is returning correct result for all pages', () => {
        onboardReposThroughProject({
            envs: [{ name: store.envName + "_repoforcheckingpagination", provider: "aws", botIds: [] }],
            repos: [
                {
                    provider: "aws", url: getUrlByName("NAU_007"),
                    name: getUrlByName("NAU_007").replace('https://bitbucket.org/tenb-qa/', '')+"-"+`${store.envName.toLowerCase()}`,
                    engineType: "terraform", config: [{
                        key: "TERRAFORM_VERSION",
                        value: Cypress.env("tf_version_for_aws_repos")
                    },
                    { key: "TERRASCAN", value: "false" }], folderPath: "/",
                    autoRemediate: "none", source: getUrlByName("NAU_007").replace('https://bitbucket.org/', '')
                }]
        })
        cy.get('@envDetails').then((response) => {
            store.envID = response[0]
            store.repoIDs = response[1]
        }).then(waitForComplianceData => {
            store.limit = 5;
            queryString = `offset=0&limit=5&environmentId=${store.envID}&provider=aws`
            cy.waitUntil(() => cy.request(getComplianceCategoryDetails(queryString)).then(response => getFilteredRuleCountForCompliance(response.body["categoryDataMap"]) > 20), {
                errorMsg: 'Compliance data is not populated within time.', // overrides the default error message
                timeout: _sixtySeconds,
                interval: _threeSeconds
            });
        }).then(getComplianceData => {
            queryString = `environmentId=${store.envID}&provider=aws&category=Compliance Validation`
            cy.request(getComplianceCategoryDetails(queryString)).then(response => {
                expect(response.status).to.eq(200);
                store.totalRuleCount = gettotalRuleCountForCompliance(response.body["categoryDataMap"]);
                expect(store.totalRuleCount).to.gt(0);
            })
        }).then(getDetailsOfFirstPage => {
            queryString = `offset=0&limit=5&environmentId=${store.envID}&provider=aws&category=Compliance Validation`;
            cy.request(getComplianceCategoryDetails(queryString)).then(response => {
                expect(response.status).to.eq(200);
                let categoryDataMapArray = Object.values(response.body["categoryDataMap"]);
                store.categoryRulesArray = categoryDataMapArray[0]["categoryRules"];
                expect(store.categoryRulesArray.length).to.eq(5);
                expect(store.categoryRulesArray[0].provider).to.eq("aws")
            })
        }).then(getDataForASpecificPolicy => {
            queryString = `reference=${store.categoryRulesArray[0].ruleReferenceId}`;
            cy.request(getPoliciesV2(queryString)).then(response => {
                expect(response.status).to.eq(200);
                expect(response.body.TotalEligibleRules).to.gt(0);
                const rulesObject = response.body.Rules[0];
                const policyObject = store.categoryRulesArray[0];
                expect(rulesObject.ruleDisplayName).to.eq(policyObject.ruleDisplay);
                expect(rulesObject.policyRelevance).to.eq(policyObject.relevance);
                expect(rulesObject.ruleName).to.eq(policyObject.rule)
                expect(rulesObject.severity.toLowerCase()).to.eq(policyObject.severity)
            })
        }).then(getDetailsOfRandomPage => {
            let randomNumberGenerated = generateRandomNumber(store.totalRuleCount);
            store.totalCount = randomNumberGenerated;
            getPageOffset(store)
            queryString = `environmentId=${store.envID}&provider=aws&category=Compliance Validation&offset=${store.offset}&limit=5`;
            cy.request(getComplianceCategoryDetails(queryString)).then(response => {
                expect(response.status).to.eq(200);
                let categoryDataMapArray = Object.values(response.body["categoryDataMap"]);
                expect(categoryDataMapArray[0]["categoryRules"][0].provider).to.eq("aws")
                expect(categoryDataMapArray[0]["stats"]["totalRuleCount"]).to.eq(store.totalRuleCount);
            })
        }).then(getDetailsOfLastPage => {
            store.totalCount = store.totalRuleCount;
            getPageOffset(store)
            queryString = `environmentId=${store.envID}&provider=aws&category=Compliance Validation&offset=${store.offset}&limit=5`;
            cy.request(getComplianceCategoryDetails(queryString)).then(response => {
                expect(response.status).to.eq(200);
                let categoryDataMapArray = Object.values(response.body["categoryDataMap"]);
                expect(categoryDataMapArray[0]["categoryRules"][0].provider).to.eq("aws")
                expect(categoryDataMapArray[0]["stats"]["totalRuleCount"]).to.eq(store.totalRuleCount);
                store.categoryRulesArray = categoryDataMapArray[0]["categoryRules"];
            })
        }).then(getDataForASpecificPolicy => {
            queryString = `reference=${store.categoryRulesArray[store.categoryRulesArray.length - 1].ruleReferenceId}`;
            cy.request(getPoliciesV2(queryString)).then(response => {
                expect(response.status).to.eq(200);
                expect(response.body.TotalEligibleRules).to.gt(0);
                const rulesObject = response.body.Rules[0];
                const policyObject = store.categoryRulesArray[store.categoryRulesArray.length - 1];
                expect(rulesObject.ruleDisplayName).to.eq(policyObject.ruleDisplay);
                expect(rulesObject.policyRelevance).to.eq(policyObject.relevance);
                expect(rulesObject.ruleName).to.eq(policyObject.rule)
                expect(rulesObject.severity.toLowerCase()).to.eq(policyObject.severity)
            })
        })
    })

    /**--------------------------------------------------------
      * Added by: rthareja
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Check if compliance category is filtered correctly', () => {
        verifyFilterComplianceForOnlyCloudProviders();
        const body = {
            envs: [{ name: store.envName + "_filteredCompliancecategory", provider: "aws", botIds: [] }],
            repos: [
                {
                    provider: "aws", url: getUrlByName("NAU_007"),
                    name: getUrlByName("NAU_007").replace('https://bitbucket.org/tenb-qa/', '')+"-"+`${store.envName.toLowerCase()}`,
                    engineType: "terraform", config: [{
                        key: "TERRAFORM_VERSION",
                        value: Cypress.env("tf_version_for_aws_repos")
                    },
                    { key: "TERRASCAN", value: "false" }], folderPath: "/",
                    autoRemediate: "none", source: getUrlByName("NAU_007").replace('https://bitbucket.org/', '')
                }]
        }
        onboardReposThroughProject(body)
        cy.get('@envDetails').then((response) => {
            store.envID = response[0]
            store.repoIDs = response[1]
        }).then(() => {
            getComplianceDataForProjectAndProvider(store.envID, body.envs[0].provider);
            cy.get('@ruleCountObjectForProjectAndProvider').then(ruleCount => {
                expect(ruleCount.filteredRuleCount).to.gt(22);
                expect(ruleCount.totalRuleCount).to.gt(22);
            })
        })

        getComplianceDataForRepoandCloudAccount(store.repoIDs, awsAccountID)
        cy.get('@ruleCountObjectForRepoIDAndCloudAccount').then(ruleCount => {
            expect(ruleCount.filteredRuleCount).to.gt(22);
            expect(ruleCount.totalRuleCount).to.gt(22);
        })
    })

    /**--------------------------------------------------------
      * Added by: rthareja
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Validate policy status and severity filter on compliance reports page', () => {
        queryString = `offset=0&limit=5&ruleStatus=passed`
        verifyFilterComplianceData(queryString);
        cy.get('@complianceData').then(complianceData => {
            expect(complianceData.rules.status).to.eq("passed");
            expect(complianceData.serverResponse.status).to.eq("passed")
        }).then(getComplianceDataForNonCompliantStatus => {
            queryString = `offset=0&limit=5&ruleStatus=failed`
            verifyFilterComplianceData(queryString);
            cy.get('@complianceData').then(complianceData => {
                expect(complianceData.rules.status).to.eq("failed");
                expect(complianceData.serverResponse.status).to.eq("failed")
            })
        }).then(getComplianceDataForNotAssessedStatus => {
            queryString = `offset=0&limit=5&ruleStatus=notassessed`
            verifyFilterComplianceData(queryString);
            cy.get('@complianceData').then(complianceData => {
                expect(complianceData.rules.status).to.eq("notassessed");
                expect(complianceData.serverResponse.status).to.eq("notassessed")
            })
        }).then(getComplianceDataForHighSeverity => {
            queryString = `offset=0&limit=5&severity=high`
            verifyFilterComplianceData(queryString);
            cy.get('@complianceData').then(complianceData => {
                expect(complianceData.rules.severity).to.eq("HIGH");
                expect(complianceData.serverResponse.severity).to.eq("high")
            })
        }).then(getComplianceDataForLowSeverity => {
            queryString = `offset=0&limit=5&severity=low`
            verifyFilterComplianceData(queryString);
            cy.get('@complianceData').then(complianceData => {
                expect(complianceData.rules.severity).to.eq("LOW");
                expect(complianceData.serverResponse.severity).to.eq("low")
            })
        }).then(getComplianceDataForMediumSeverity => {
            queryString = `offset=0&limit=5&severity=medium`
            verifyFilterComplianceData(queryString);
            cy.get('@complianceData').then(complianceData => {
                expect(complianceData.rules.severity).to.eq("MEDIUM");
                expect(complianceData.serverResponse.severity).to.eq("medium")
            })
        })
    })

    /**--------------------------------------------------------
      * Added by: rthareja
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Validate project and severity filter on compliance reports page', () => {
        queryString = `offset=0&limit=5&environmentId=${store.envID}&provider=aws`
        cy.waitUntil(() => cy.request(getComplianceCategoryDetails(queryString)).then(response => getFilteredRuleCountForCompliance(response.body["categoryDataMap"]) > 20), {
            errorMsg: 'Compliance data is not populated within time.', // overrides the default error message
            timeout: _sixtySeconds,
            interval: _threeSeconds
        }).then(getComplianceDataForHighSeverityAndAParticularProject => {
            queryString = `offset=0&limit=5&severity=high&environmentId=${store.envID}&ruleStatus=failed`
            verifyFilterComplianceData(queryString)
            cy.get('@complianceData').then(complianceData => {
                expect(complianceData.serverResponse.environments[0]).to.eq(store.envID);
                expect(complianceData.rules.severity).to.eq("HIGH");
                expect(complianceData.serverResponse.severity).to.eq("high")
            })
        }).then(getComplianceDataForMediumSeverityAndAParticularProject => {
            queryString = `offset=0&limit=5&severity=medium&environmentId=${store.envID}&ruleStatus=failed`
            verifyFilterComplianceData(queryString)
            cy.get('@complianceData').then(complianceData => {
                expect(complianceData.serverResponse.environments[0]).to.eq(store.envID);
                expect(complianceData.rules.severity).to.eq("MEDIUM");
                expect(complianceData.serverResponse.severity).to.eq("medium")
            })
        }).then(getComplianceDataForLowSeverityAndAParticularProject => {
            queryString = `offset=0&limit=5&severity=low&environmentId=${store.envID}&ruleStatus=failed`
            verifyFilterComplianceData(queryString)
            cy.get('@complianceData').then(complianceData => {
                expect(complianceData.serverResponse.environments[0]).to.eq(store.envID);
                expect(complianceData.rules.severity).to.eq("LOW");
                expect(complianceData.serverResponse.severity).to.eq("low")
            })
        })
    })

    /**--------------------------------------------------------
      * Added by: rthareja
      * Test Management ID: 
    ---------------------------------------------------------*/
    it('MUST - Validate cloud Account and severity filter on compliance reports page', () => {
        queryString = `offset=0&limit=5&severity=high&cloudAccount=${awsAccountID}&ruleStatus=failed`
        verifyFilterComplianceData(queryString);
        cy.get('@complianceData').then(complianceData => {
            expect(complianceData.serverResponse.cloudAccounts[0]).to.eq(awsAccountID)
            expect(complianceData.rules.severity).to.eq("HIGH");
            expect(complianceData.serverResponse.severity).to.eq("high")
        }).then(getComplianceDataForMediumSeverityAndAParticularCloudAccount => {
            queryString = `offset=0&limit=5&severity=medium&cloudAccount=${awsAccountID}&ruleStatus=failed`
            verifyFilterComplianceData(queryString, store)
            cy.get('@complianceData').then(complianceData => {
                expect(complianceData.serverResponse.cloudAccounts[0]).to.eq(awsAccountID)
                expect(complianceData.rules.severity).to.eq("MEDIUM");
                expect(complianceData.serverResponse.severity).to.eq("medium")
            })
        }).then(getComplianceDataForLowSeverityAndAParticularCloudAccount => {
            queryString = `offset=0&limit=5&severity=low&cloudAccount=${awsAccountID}&ruleStatus=failed`
            verifyFilterComplianceData(queryString, store)
            cy.get('@complianceData').then(complianceData => {
                expect(complianceData.serverResponse.cloudAccounts[0]).to.eq(awsAccountID)
                expect(complianceData.rules.severity).to.eq("LOW");
                expect(complianceData.serverResponse.severity).to.eq("low")
            })
        })
    })
})