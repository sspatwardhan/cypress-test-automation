import { getUrlByName } from './apiAndNonApiUrlsMapper'

/**----------------------------------------------------------------
 * Description: calls related to Tenable CS compliance reports
 ------------------------------------------------------------------*/
 //Have not used qs:qs method of cypress as it has limitation when there are duplicate params its appending ascii characters in url
 //https://github.com/cypress-io/cypress/issues/19355 => for more info
import {_sixtySeconds, _threeSeconds, _fifteenSeconds, generateRandomNumber } from '../support/utils';
import { getPoliciesV2 } from '../requests/policy-groups-and-policies'

 function getComplianceCategoryDetails(qs) {
    return {
         method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName("AU_040")+'?'+qs
    }
}

function getFilteredRuleCountForCompliance(categoryMap){
    var countOfFailedPolicies = 0
    var categoryMapArray = Object.values(categoryMap)
    categoryMapArray.forEach(function (undefined, index) {
        countOfFailedPolicies = countOfFailedPolicies + categoryMapArray[index]["stats"]["filteredRuleCount"]
      });
      return countOfFailedPolicies
}

function getFilteredResourceFailingPoliciesCount(resourceApiData){
    var countOfFilteredResourceFailingPolicies = 0
    resourceApiData.forEach(function (undefined, index){
        countOfFilteredResourceFailingPolicies = countOfFilteredResourceFailingPolicies + resourceApiData[index]["violations"].length
    });
    return countOfFilteredResourceFailingPolicies
}

function getChartsDetailsForCompliance(qs){
    return {
        method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName("AU_097")+'?'+qs
   }
}

function getPolicyGroupsCountForCompliance(policyGroupsData){
    var policyGroupDataArray = []
    policyGroupsData.forEach(function (undefined, index) {
        var element = policyGroupsData[index]
        var { name, rules, provider } = element; 
        var result = { name, rules, provider };
        policyGroupDataArray.push(result)
      });
      return policyGroupDataArray
}

function getBenchMarkNamesForCompliance(){
    return {
        method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: getUrlByName("AU_098")
   }
}

function gettotalRuleCountForCompliance(categoryDataMap) {
    /**
     * Can return total rule count for a particular category or all the categories
     * @param {json} categoryDataMap includes categoryRules and Stats
     */
    let categoryDataMapArray = Object.values(categoryDataMap);
    let totalRuleCount =  0;
    categoryDataMapArray.map((undefined, index) => {
        totalRuleCount += categoryDataMapArray[index]["stats"]["totalRuleCount"]
    })
    return totalRuleCount;
}

function getQueryStringObjectForCompliance() {
    let queryString = '';
    let providers = [];
    for(let i=0;i<arguments.length;i++){
        providers.push(arguments[i]);
        if(i != arguments.length-1)
        queryString += `provider=${arguments[i]}&`;
        else
        queryString += `provider=${arguments[i]}`;
    }
    return {queryString,providers};
}

function verifyFilterComplianceForOnlyCloudProviders() {
    /**
     * Filter the results for any number of cloud providers provided as a filter and get compliance category results
     */
    let queryString = `offset=0&limit=5&provider=aws`
    let providers = []
    cy.waitUntil(() => cy.request(getComplianceCategoryDetails(queryString)).then(response => getFilteredRuleCountForCompliance(response.body["categoryDataMap"]) > 20), {
        errorMsg: 'Compliance data is not populated within time.', // overrides the default error message
        timeout: _sixtySeconds,
        interval: _threeSeconds
    }).then(filteredForCloudProvider => {
        let argsObject = getQueryStringObjectForCompliance("aws","azure","gcp","k8s");
        queryString = argsObject.queryString + '&category=Configuration and Vulnerability Analysis';
        providers = argsObject.providers;
    }).then(getComplianceData => {
        cy.request(getComplianceCategoryDetails(queryString)).then(response => {
        expect(response.status).to.eq(200);
        expect(gettotalRuleCountForCompliance(response.body["categoryDataMap"])).to.gt(0);
        let categoryDataMapArray = Object.values(response.body["categoryDataMap"]);
        let categoryRulesArray = categoryDataMapArray[0]["categoryRules"];
        for(let i=0;i<categoryRulesArray.length;i++){
            expect(providers.includes(categoryRulesArray[i].provider)).to.eq(true);
            }
        })
    })
}

function verifyFilterComplianceData(queryString) {
    /**
         * This function is used to verify the compliance data that is displayed on the compliance page with
         * the data that is received from the server
         * @param queryString - This is the query string that you want to pass to the API.
     */
    let complianceData = {};
    // It is making a request to the api /v2/api/resources/global/category/compliance and getting the response including Category Data Map Object.
    cy.request(getComplianceCategoryDetails(queryString)).then(response => {
        expect(response.status).to.eq(200);
        const categoryDataMapObject = response.body["categoryDataMap"]
        /*  Removing the categories that have no categoryRules. */
        for(const property in categoryDataMapObject){
            if(categoryDataMapObject[property].categoryRules.length == 0){
                delete categoryDataMapObject[property]
            }
        }
        const keys = Object.keys(categoryDataMapObject);
        let randomNumberGenerated = generateRandomNumber(keys.length);
        let serverResponse = categoryDataMapObject[keys[randomNumberGenerated]].categoryRules[0];
        let ruleReferenceIdString = serverResponse.ruleReferenceId;
        let word = "CUSTOM"
        /*  Avoiding the custom policies recieved. */
        while(ruleReferenceIdString.includes(word)){
            randomNumberGenerated = generateRandomNumber(keys.length);
            serverResponse = categoryDataMapObject[keys[randomNumberGenerated]].categoryRules[0];
            ruleReferenceIdString = serverResponse.ruleReferenceId;
        }
        complianceData.serverResponse = serverResponse;
    }).then(getDetailsOfRandomPolicy => {
        queryString = `reference=${complianceData.serverResponse.ruleReferenceId}`
        // It is making a request to the api v2/api/resources/global/rule-violations and getting the response including rulesArray for the UI.
        cy.request(getPoliciesV2(queryString)).then(response => {
            let rulesArray = response.body.Rules;
            complianceData.rules = rulesArray[0];
            // Validating the response from the server with the data in the UI.
            expect(complianceData.serverResponse.severity).to.eq(rulesArray[0].severity.toLowerCase());
            expect(complianceData.serverResponse.status).to.eq(rulesArray[0].status);
            expect(complianceData.serverResponse.ruleDisplay).to.eq(rulesArray[0].ruleDisplayName);
            expect(complianceData.serverResponse.rule).to.eq(rulesArray[0].ruleName)
            expect(complianceData.serverResponse.relevance).to.eq(rulesArray[0].policyRelevance);
            expect(complianceData.serverResponse.provider).to.eq(rulesArray[0].provider);
            const categories = complianceData.serverResponse.categories;
            expect(categories.includes(rulesArray[0].category)).to.eq(true)
        })
    }).then(() => {
        cy.wrap(complianceData).as('complianceData')
    })
}

function getComplianceDataForProjectAndProvider(envId, provider) {
    /**
     * Filter Compliance Results for a particular envId and a particular provider
     * @param {string} envID gives the project id of newly created project
     * @param {string} provider tells the provider used to create the project
     */
    let queryString = `offset=0&limit=5&environmentId=${envId}&provider=${provider}`;
    let ruleCountObjectForProjectAndProvider = {};
    cy.waitUntil(() => cy.request(getComplianceCategoryDetails(queryString)).then(response => getFilteredRuleCountForCompliance(response.body["categoryDataMap"]) > 20), {
        errorMsg: 'Compliance data is not populated within time.', // overrides the default error message
        timeout: _sixtySeconds,
        interval: _threeSeconds
    }).then(getComplianceData => {
        queryString = `offset=0&limit=5&environmentId=${envId}&provider=${provider}`
        cy.request(getComplianceCategoryDetails(queryString)).then(response => {
            expect(response.status).to.eq(200)
            ruleCountObjectForProjectAndProvider.filteredRuleCount = getFilteredRuleCountForCompliance(response.body["categoryDataMap"]);
            ruleCountObjectForProjectAndProvider.totalRuleCount = gettotalRuleCountForCompliance(response.body["categoryDataMap"])
        })
    }).then(() => {
        cy.wrap(ruleCountObjectForProjectAndProvider).as('ruleCountObjectForProjectAndProvider')
    })

}

function getComplianceDataForRepoandCloudAccount(repoId, cloudAccountId) {
    /**
     * Filter Compliance Results for a particular repoID and a particular cloudAccount
     * @param {string} repoID gives the repo id associated with the project
     * @param {string} cloudAccountId gives the id of the cloud Account
     */
    let queryString = `offset=0&limit=5&cloudAccount=${cloudAccountId}&repoId=${repoId}`;
    let ruleCountObjectForRepoIDAndCloudAccount = {};
    cy.request(getComplianceCategoryDetails(queryString)).then(response => {
        expect(response.status).to.eq(200)
        ruleCountObjectForRepoIDAndCloudAccount.filteredRuleCount = getFilteredRuleCountForCompliance(response.body["categoryDataMap"]);
        ruleCountObjectForRepoIDAndCloudAccount.totalRuleCount = gettotalRuleCountForCompliance(response.body["categoryDataMap"])
    }).then(() => {
        cy.wrap(ruleCountObjectForRepoIDAndCloudAccount).as('ruleCountObjectForRepoIDAndCloudAccount')
    })
}

function exportMisconfigurations(qs){
    return{
         method: 'POST', headers: { 'x-cookie': Cypress.env('tcsToken') },
         url: getUrlByName('AU_108')+`?${qs}`,
    }
}

export{
    getComplianceCategoryDetails, getFilteredRuleCountForCompliance, getBenchMarkNamesForCompliance,
    getFilteredResourceFailingPoliciesCount, getChartsDetailsForCompliance, getPolicyGroupsCountForCompliance, 
    gettotalRuleCountForCompliance, verifyFilterComplianceForOnlyCloudProviders, 
    getComplianceDataForProjectAndProvider, getComplianceDataForRepoandCloudAccount, verifyFilterComplianceData, exportMisconfigurations
}