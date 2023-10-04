import { getPolicyDetails } from '../../../requests/policy-groups-and-policies';
import { initAPISpecRoutine, _twentySeconds } from '../../../support/utils';



describe('Policies validation', () => {
  before(() => initAPISpecRoutine('before'))
  after(()=> initAPISpecRoutine('after'))

 /**--------------------------------------------------------
  * Added by: tlikhar
  * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Verify if https policies contain valid hyperlink inside policy', () => {
    let queryString = `desc=https`
    cy.request(getPolicyDetails(queryString)).then((res) => {
      let policiesArray = res.body
      let ruleDisplayName = []
      const pattern = /\[(.*)\]\s*\(([^\s\\()]*)\)/g;
      for(let i=0; i < policiesArray.length; i ++){
        if(!pattern.test(policiesArray[i]["remediation"])){
            ruleDisplayName.push(policiesArray[i]["ruleDisplayName"])
        }
      }
      expect(ruleDisplayName.length).to.eq(0)
    })
  })

})