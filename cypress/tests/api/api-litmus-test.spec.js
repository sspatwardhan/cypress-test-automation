import { createEnv } from '../../requests/projects'
import { initAPISpecRoutine, _threeSeconds, _tenSeconds, _sixtySeconds, _fifteenSeconds, _twentySeconds, letsWait, getSpecBasedNamePrefix, getPageOffset, generateRandomNumber } from '../../support/utils'

describe('Litmus tests', () => {
  before(() => initAPISpecRoutine('before'))
  it('MUST - AWS - Create Project', () => {
    cy.log(Cypress.env('cloudAccountIDs').aws_536274239938)
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Test2 - FAIL', () => {
    expect(2).to.eq(3) // - TO FAIL
  })



})