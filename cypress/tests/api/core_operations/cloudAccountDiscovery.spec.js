import { deleteCloudAccount, onboardCloudAccount, ignoreCloudAccount, getMemberCloudAccounts, getGlobalClouds } from '../../../requests/cloudAccounts'
import { initAPISpecRoutine, getSpecBasedNamePrefix, _sixtySeconds, _threeSeconds, _fifteenSeconds, _twentySeconds } from '../../../support/utils'

const store = {
   envName: `${getSpecBasedNamePrefix() + Date.now()}`
}

describe('Core Operations - Cloud Discovery for all the Supported Providers', () => {
   before(() => initAPISpecRoutine('before'))
   after(() => initAPISpecRoutine('after'))

   /**------------------------------------------------------
    * Added by: Arti
    * Test Management ID:
   ---------------------------------------------------------*/
   it('MUST - AWS - ignore cloud account', () => {
      cy.request(ignoreCloudAccount([Cypress.env('cloudAccountIDs').aws_068347883986]))
      .then((response) => {
         expect(response.status).to.eq(202)
      })
      .then((verifyIfCloudAccountIgnoredInMemberCloudAccount) => {
         cy.request(getMemberCloudAccounts())
         .then((response) => {
            expect(response.body.find(CAs => CAs.accountID == "068347883986").status).to.eq("Ignored")
         })
      })
      .then((verifyIfCloudAccountIgnoredInGlobalClouds) => {
         cy.request(getGlobalClouds())
         .then((response) => {
            expect(response.body.clouds.find(CAs => CAs.account == "068347883986")).to.eq(undefined)
         })
      })
   })

   /**--------------------------------------------------
    * Added by: Arti
    * Test Management ID:
   ---------------------------------------------------------*/
   it('MUST - AWS - delete cloud account', () => {
      cy.request(deleteCloudAccount([Cypress.env('cloudAccountIDs').aws_068347883986]))
      .then((response) => {
         expect(response.status).to.eq(202)
      })
      .then((verifyIfCloudAccountIgnoredInMemberCloudAccount) => {
         cy.request(getMemberCloudAccounts())
         .then((response) => {
            expect(response.body.find(CAs => CAs.accountID == "068347883986")).to.eq(undefined)
         })
      })
      .then((verifyIfCloudAccountIgnoredInGlobalClouds) => {
         cy.request(getGlobalClouds())
         .then((response) => {
            expect(response.body.clouds.find(CAs => CAs.account == "068347883986")).to.eq(undefined)
         })
      })
   })

   /**--------------------------------------------------------
    * Added by: Arti
    * Test Management ID:
   ---------------------------------------------------------*/
   it('MUST - AWS - verify user is able to onboard a non-org-root cloud account without member account discovery', () => {
      cy.request(onboardCloudAccount([{ provider: "aws", isDiscoveryEnabled: false, credential: { rolearn: "arn:aws:iam::068347883986:role/tenableio-connector_dev", externalId: "123456" } }]))
      .then((response) => {
         expect(response.status).to.eq(202)
      })
      .then((verifyIfCloudAccountIgnoredInMemberCloudAccount) => {
         cy.request(getMemberCloudAccounts())
         .then((response) => {
            expect(response.body.find(CAs => CAs.accountID == "068347883986").status).to.eq("Discovered")
         })
      })
   })

   /**------------------------------------------------------
    * Added by: Arti
    * Test Management ID:
   ---------------------------------------------------------*/
   it('MUST - Azure - ignore cloud accounts', () => {
      cy.request(ignoreCloudAccount([Cypress.env('cloudAccountIDs').azure_94cc5da3_e578_43fd_8795_a3a4703f2e6b]))
      .then((response) => {
         expect(response.status).to.eq(202)
      })
      .then((verifyIfCloudAccountIgnoredInMemberCloudAccount) => {
         cy.request(getMemberCloudAccounts())
         .then((response) => {
            expect(response.body.find(CAs => CAs.accountID == "94cc5da3-e578-43fd-8795-a3a4703f2e6b").status).to.eq("Ignored")
         })
      })
      .then((verifyIfCloudAccountIgnoredInGlobalClouds) => {
         cy.request(getGlobalClouds())
         .then((response) => {
            expect(response.body.clouds.find(CAs => CAs.account == "94cc5da3-e578-43fd-8795-a3a4703f2e6b")).to.eq(undefined)
         })
      })
   })

   /**--------------------------------------------------------
      * Added by: Arti
      * Test Management ID:
   ---------------------------------------------------------*/
   it('MUST - Azure - delete cloud account', () => {
      cy.request(deleteCloudAccount([Cypress.env('cloudAccountIDs').azure_94cc5da3_e578_43fd_8795_a3a4703f2e6b]))
      .then((response) => {
         expect(response.status).to.eq(202)
      })
      .then((verifyIfCloudAccountIgnoredInMemberCloudAccount) => {
         cy.request(getMemberCloudAccounts())
         .then((response) => {
            expect(response.body.find(CAs => CAs.accountID == "94cc5da3-e578-43fd-8795-a3a4703f2e6b")).to.eq(undefined)
         })
      })
      .then((verifyIfCloudAccountIgnoredInGlobalClouds) => {
         cy.request(getGlobalClouds())
         .then((response) => {
            expect(response.body.clouds.find(CAs => CAs.account == "94cc5da3-e578-43fd-8795-a3a4703f2e6b")).to.eq(undefined)
         })
      })
   })

   /**--------------------------------------------------------
     * Added by: Arti
     * Test Management ID:
   ---------------------------------------------------------*/
   it('MUST - Azure - verify user is able to onboard a non-org-root cloud account without member account discovery', () => {
      cy.request(onboardCloudAccount([{ provider: "azure", isDiscoveryEnabled: false, credential: { clientId: "33941fd4-342a-42b3-94c8-f6b47b841816", clientSecret: "wWu8Q~bOTZ.EOPdfAXW7HC8g0YhqaLV_5Y_xZbCY", tenantId: "6a2b8079-0320-405f-ad21-17a3103014f6", subscriptionId: "94cc5da3-e578-43fd-8795-a3a4703f2e6b" } }]))
      .then((response) => {
         expect(response.status).to.eq(202)
      })
      .then((verifyIfCloudAccountIgnoredInMemberCloudAccount) => {
         cy.request(getMemberCloudAccounts())
         .then((response) => {
            expect(response.body.find(CAs => CAs.accountID == "94cc5da3-e578-43fd-8795-a3a4703f2e6b").status).to.eq("Discovered")
         })
      })
   })

   /**------------------------------------------------------
    * Added by: Arti
    * Test Management ID:
   ---------------------------------------------------------*/
   it('MUST - GCP - ignore cloud accounts', () => {
      cy.request(ignoreCloudAccount([Cypress.env('cloudAccountIDs').gcp_performance_resources]))
      .then((response) => {
         expect(response.status).to.eq(202)
      })
      .then((verifyIfCloudAccountIgnoredInMemberCloudAccount) => {
         cy.request(getMemberCloudAccounts())
         .then((response) => {
            expect(response.body.find(CAs => CAs.accountID == "performance-resources").status).to.eq("Ignored")
         })
      })
      .then((verifyIfCloudAccountIgnoredInGlobalClouds) => {
         cy.request(getGlobalClouds())
         .then((response) => {
            expect(response.body.clouds.find(CAs => CAs.account == "performance-resources")).to.eq(undefined)
         })
      })
   })

   /**--------------------------------------------------------
       * Added by: Arti
       * Test Management ID:
   ---------------------------------------------------------*/
   it('MUST - GCP - delete cloud account', () => {
      cy.request(deleteCloudAccount([Cypress.env('cloudAccountIDs').gcp_performance_resources]))
      .then((response) => {
         expect(response.status).to.eq(202)
      })
      .then((verifyIfCloudAccountIgnoredInMemberCloudAccount) => {
         cy.request(getMemberCloudAccounts())
         .then((response) => {
            expect(response.body.find(CAs => CAs.accountID == "performance-resources")).to.eq(undefined)
         })
      })
      .then((verifyIfCloudAccountIgnoredInGlobalClouds) => {
         cy.request(getGlobalClouds())
         .then((response) => {
            expect(response.body.clouds.find(CAs => CAs.account == "performance-resources")).to.eq(undefined)
         })
      })
   })

   /**--------------------------------------------------------
    * Added by: Arti
    * Test Management ID:
   ---------------------------------------------------------*/
   it('MUST - GCP - verify user is able to onboard a non-org-root cloud account without member account discovery', () => {
      cy.request(onboardCloudAccount([{ isDiscoveryEnabled: false, provider: "gcp", credential: { "serviceAccountCredentials": Cypress.env("gcpCredentials_perf_test") } }]))
      .then((response) => {
         expect(response.status).to.eq(202)
      })
      .then((verifyIfCloudAccountIgnoredInMemberCloudAccount) => {
         cy.request(getMemberCloudAccounts())
         .then((response) => {
            expect(response.body.find(CAs => CAs.accountID == "performance-resources").status).to.eq("Discovered")
         })
      })
   })
})

