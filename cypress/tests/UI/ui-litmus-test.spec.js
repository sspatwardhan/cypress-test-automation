import { cleanSlate } from '../../requests/projects'
import { _tenSeconds, _sixtySeconds, _fifteenSeconds, _twentySeconds, letsWait, getSpecBasedNamePrefix } from '../../support/utils'
const store = {
  envName: `${getSpecBasedNamePrefix() + Date.now()}`
}

describe('UI - Visual regression suite', () => {
  before(() => { cy.login().then(cleanUp => { cleanSlate() }) })
  beforeEach(() => { cy.on('uncaught:exception', (err) => { return false; }) })

  //--------------------- Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - AWS - VPC Check - RoleARN/ExtermalID', () => {
    cy.visit(Cypress.config().baseUrl+"/newEnv/vulnerability")
    // cy.percySnapshot();
    cy.wait(10000)
    cy.percySnapshot('cns_home_misconfigurations_on_landing');
  })




})