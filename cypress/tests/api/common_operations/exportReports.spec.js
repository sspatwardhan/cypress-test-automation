import { initAPISpecRoutine, _threeSeconds, _tenSeconds, _sixtySeconds, _fifteenSeconds, _twentySeconds, letsWait, getSpecBasedNamePrefix, getPageOffset, generateRandomNumber } from '../../../support/utils'
import { exportMisconfigurations } from '../../../requests/compliance'
import { getFilteredViolations } from '../../../requests/projects'

const store = {
    envName: `${getSpecBasedNamePrefix() + Date.now()}`
}

let expectedMisconfigCsvHeaders = ['Project', 'Source', 'Cloud Provider', 'Cloud Account', 'Region', 'VPC', 'Policy Group',
    'Severity', 'Policy ID', 'Failing Policy', 'Policy Link', 'Resource Type', 'Cloud ARN', 'Cloud Resource ID', 'Cloud Resource Name',
    'Remediation', 'IaC Resource ID', 'IaC Resource Name', 'IaC Repo', 'Last seen on', 'First seen on', 'Public IP Address',
    'Private IP Address', 'DNS', 'Cloud Tags']

let expectedMisconfigurationsCsv = ['Ensure Code Signing is enabled for AWS Lambda functions',
    'Ensure no security groups allow ingress from 0.0.0.0/0 to remote server administration ports',
    'Ensure AWS Lambda function permissions have a source ARN specified']

let expectedReportSummaryCsvHeaders = ['Benchmark', 'Project', 'Cloud Provider', 'Cloud Account',
    'Count of Failed Policies', 'Count of Passed Policies', 'Count of Excluded Policies', 'Count of Skipped Policies']

let expectedReportDetailsCsvHeaders = ['Benchmark', 'Project', 'Cloud Provider', 'Cloud Account', 'Severity',
    'Control', 'Policy ID', 'Policy', 'Status', 'Total Evaluated Resources',
    'Count of Failed Resources', 'Count of Passed Resources', 'Last Assessed']

let expectedPolicyCsvHeaders = ['Policy Group', 'Cloud Provider', 'Severity', 'Category',
    'Policy ID', 'Policy', 'Status', 'Total Evaluated Resources'
    , 'Count of Failed Resources', 'Count of Passed Resources', 'Last Assessed']

let fileName = '/misconfig.csv'

describe('Common Operations - Exports', () => {
    before(() => initAPISpecRoutine('before'))
    after(() => initAPISpecRoutine('after'))

    //--------------------- Tests start here ------------------------
    /**--------------------------------------------------------
     * Added by: tlikhar
     * Test Management ID:
    ---------------------------------------------------------*/
    it('MUST - Validate the findings->misconfigurations exported csv contents', () => {
        let queryString = `hasViolation=true&showIgnored=false&hasCloud=true&hasIac=false&hasImage=false&mapped=false&template=misconfigurations&format=csv&timezone=Asia%2FCalcutta`
        cy.request(exportMisconfigurations(queryString))
        .then((response) => {
                cy.writeFile('cypress/fixtures' + fileName, response.body)
        })
        .then((validateCsvContents) => {
            cy.task('parseCsvFile', 'cypress/fixtures' + fileName)
                .then((data) => {
                    expect(data.length).to.be.greaterThan(0)
                    let csvHeaders = Object.keys(data[0])
                    //validating misconfig csv headers
                    expect(csvHeaders).to.deep.eq(expectedMisconfigCsvHeaders)
                    expectedMisconfigurationsCsv.forEach((misconfig) => {
                    let filterMisconfig = data.filter((row) => row['Failing Policy'] === misconfig)
                    //validating expected misconfigs for aws terraform are present in csv
                    expect(filterMisconfig.length).to.be.gt(0)
                    expect(filterMisconfig[0]['Failing Policy']).to.eq(misconfig)
                    })
                    let sourceName = data.map(row => row['Source'])
                    let uniqueSourceName = new Set(sourceName)
                    //validating project filter is working for csv
                    expect(uniqueSourceName.size).to.eq(1)
                })
        })
    })

    /**--------------------------------------------------------
     * Added by: tlikhar
     * Test Management ID:
    ---------------------------------------------------------*/
    it('MUST - Validate the findings->Ignored misconfigurations exported csv contents', () => {
        let queryString = `hasViolation=true&showIgnored=true&hasCloud=false&hasIac=false&hasImage=false&mapped=false&template=misconfigurations&format=csv&timezone=Asia%2FCalcutta`
        let filters = 'hasViolation=true&showIgnored=true';
        cy.request(getFilteredViolations(null, filters))
        .then((res) => {
            expect(res.status).to.eq(200);
            store.expectedIgnoreMisconfigs = res.body.types.length
        })
        .then(() => {
            cy.request(exportMisconfigurations(queryString))
                .then((response) => {
                    cy.writeFile('cypress/fixtures' + fileName, response.body)
            })
        })
        .then((validateCsvContents) => {
            cy.task('parseCsvFile', 'cypress/fixtures' + fileName)
                .then((data) => {
                        expect(data.length).to.be.gte(store.expectedIgnoreMisconfigs)
                })
        })
    })

    /**--------------------------------------------------------
     * Added by: tlikhar
     * Test Management ID:
    ---------------------------------------------------------*/
    it('MUST - Validate the reports->summary csv contents', () => {
        let queryString = `search=&template=compliance&format=csv&timezone=Asia%2FCalcutta&type=summary`
        cy.request(exportMisconfigurations(queryString))
        .then((response) => {
            cy.writeFile('cypress/fixtures' + fileName, response.body)
        })
        .then((validateCsvContents) => {
            cy.task('parseCsvFile', 'cypress/fixtures' + fileName)
            .then((data) => {
                expect(data.length).to.be.greaterThan(0)
                let csvHeaders = Object.keys(data[0])
                //validating misconfig csv headers
                expect(csvHeaders).to.deep.eq(expectedReportSummaryCsvHeaders)
                let failedPolicyCount = 0
                data.forEach((row) => {
                    failedPolicyCount = failedPolicyCount + parseInt(row['Count of Failed Policies'])
                    })
                    expect(failedPolicyCount).to.be.gte(1)
                })
        })
    })

    /**--------------------------------------------------------
     * Added by: tlikhar
     * Test Management ID:
    ---------------------------------------------------------*/
    it('MUST - Validate the reports->details csv contents', () => {
        let queryString = `search=&template=compliance&format=csv&timezone=Asia%2FCalcutta&type=details`
        cy.request(exportMisconfigurations(queryString))
        .then((response) => {
            cy.writeFile('cypress/fixtures' + fileName, response.body)
        })
        .then((validateCsvContents) => {
            cy.task('parseCsvFile', 'cypress/fixtures' + fileName)
            .then((data) => {
                expect(data.length).to.be.greaterThan(0)
                let csvHeaders = Object.keys(data[0])
                //validating misconfig csv headers
                expect(csvHeaders).to.deep.eq(expectedReportDetailsCsvHeaders)
                    expectedMisconfigurationsCsv.forEach((misconfig) => {
                        let filterMisconfig = data.filter((row) => row['Policy'] === misconfig)
                        //validating expected misconfigs for aws terraform are present in csv
                        expect(filterMisconfig.length).to.be.gt(0)
                        expect(filterMisconfig[0]['Policy']).to.eq(misconfig)
                    })            
                    let failedResourcesCount = 0
                    data.forEach((row) => {
                        failedResourcesCount = failedResourcesCount + parseInt(row['Count of Failed Resources'])
                    })
                    expect(failedResourcesCount).to.be.gte(1)
            })
        })
    })

    /**--------------------------------------------------------
     * Added by: tlikhar
     * Test Management ID:
    ---------------------------------------------------------*/
    it('MUST - Validate the reports->details csv contents with filter', () => {
        let queryString = `search=${expectedMisconfigurationsCsv[0]}&template=compliance&format=csv&timezone=Asia%2FCalcutta&type=details`
        cy.request(exportMisconfigurations(queryString))
        .then((response) => {
            cy.writeFile('cypress/fixtures' + fileName, response.body)
        })
        .then((validateCsvContents) => {
            cy.task('parseCsvFile', 'cypress/fixtures' + fileName)
                .then((data) => {
                    expect(data.length).to.be.greaterThan(0)
                    let csvHeaders = Object.keys(data[0])
                    //validating misconfig csv headers
                    expect(csvHeaders).to.deep.eq(expectedReportDetailsCsvHeaders)
                    let policyName = data.map(row => row['Policy'])
                    let uniquePolicyName = new Set(policyName)
                    //validating search filter is working for csv
                    expect(uniquePolicyName.size).to.eq(1)
                })
        })
    })

    /**--------------------------------------------------------
     * Added by: tlikhar
     * Test Management ID:
    ---------------------------------------------------------*/
    it('MUST - Validate the policy csv contents', () => {
        let queryString = `severity=high&template=policies&format=csv&timezone=Asia%2FCalcutta&type=details`
        cy.request(exportMisconfigurations(queryString))
        .then((response) => {
            cy.writeFile('cypress/fixtures' + fileName, response.body)
        })
        .then((validateCsvContents) => {
            cy.task('parseCsvFile', 'cypress/fixtures' + fileName)
                .then((data) => {
                    expect(data.length).to.be.greaterThan(0)
                    let csvHeaders = Object.keys(data[0])
                    //validating misconfig csv headers
                    expect(csvHeaders).to.deep.eq(expectedPolicyCsvHeaders)
                    let policyName = data.map(row => row['Severity'])
                    let uniquePolicyName = new Set(policyName)
                    //validating search filter is working for csv
                    expect(uniquePolicyName.size).to.eq(1)
                })
        })
    })





})