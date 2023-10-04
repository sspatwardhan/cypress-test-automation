import {
  getAllInsights, getInsightByName, setFavourite, searchInsight, viewInAsset, severityFilter
} from '../../../../requests/cloudInsights'
import { getGlobalResourcesData } from '../../../../requests/repositoriesAndResources'
import { initAPISpecRoutine } from '../../../../support/utils'

describe('Core Operations - getInsight', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))

  const store = {}

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Get all insights', () => {
    cy.request(getAllInsights())
    .then((response) => {
      expect(response.status).to.eq(200);
      store.cloudInsightName = response.body.other[1].name //updated to other[1].Will update it to previous one i.e (other[3]) once INS-170 is fixed
      let insightName = []
      insightName = response.body.other.map(name => name.name)
      expect(insightName.some(name => name === "Unused Security Groups")).to.eq(true);
      expect(insightName.some(name => name === "Publicly exposed instances via a network interface")).to.eq(true);
      expect(response.body.other.length).to.greaterThan(0)
      expect(response.body.other.length).to.greaterThan(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Get insight by name ', () => {
    cy.request(getInsightByName(store.cloudInsightName))
    .then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.name).to.eq(store.cloudInsightName);
      expect(response.body.total_count).to.greaterThan(0);
      expect(response.body.criticality).to.eq("LOW");
      expect(response.body.is_favorite).to.eq(false)
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Add insights to Favourite', () => {
    cy.request(setFavourite(JSON.stringify({ name  : store.cloudInsightName,favorite : true })))
    .then((response) => {
      expect(response.status).to.eq(200);
    })
    .then((verifyIfInsightIsAddedToFavourite) => {
      cy.request(getAllInsights())
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.favorite[0].name).to.eq(store.cloudInsightName);
        expect(response.body.favorite[0].is_favorite).to.eq(true)
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Remove insights from Favourite', () => {
    cy.request(setFavourite({ "name": store.cloudInsightName, "favourite": false }))
    .then((response) => {
      expect(response.status).to.eq(200);
    })
    .then((verifyIfInsightIsRemovedfromFavourite) => {
      cy.request(getAllInsights())
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.favorite).to.null
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Search insights ', () => {
    cy.request(searchInsight(store.cloudInsightName))
    .then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.other[0].name).to.eq(store.cloudInsightName);
      expect(response.body.other.length).to.equal(1)
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Apply severity filter ', () => {
    cy.request(severityFilter("LOW"))
    .then((response) => {
      expect(response.status).to.eq(200);
      let cloudInsightName = []
      cloudInsightName = response.body.other.map(name => name.name)
      expect(cloudInsightName.some(name => name === "Publicly exposed instances via a network interface")).to.eq(true);
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - View impacted resource details of insight', () => {
    cy.request(viewInAsset(store.cloudInsightName))
    .then((response) => {
      expect(response.body.name).to.eq(store.cloudInsightName);
      expect(response.status).to.eq(200);
      expect(response.body.total_count).to.greaterThan(0)
      store.assetId = response.body.response.results[0].assetId
      console.log(store.assetId)
    })
    .then(viewImpactedResourceDetails => {
      cy.request(getGlobalResourcesData(`useBaseline=true&limit=1&offset=0&globalCloudId=${store.assetId}`))
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.resources[0].cloud).to.equal("aws")
        expect(response.body.resources[0].cftAccount).to.equal("536274239938")
        expect(response.body.resources[0].cftAccount).not.eq(null)
      })
    })
  })

  // /**--------------------------------------------------------
  //  * Added by: Arti
  //  * Test Management ID:
  // ---------------------------------------------------------*/
  // it('MUST - delete insight ', () => {
  //   cy.request(deleteInsight(store.cloudInsightName)).then((response) => {
  //     expect(response.status).to.eq(200);
  //   })
  // })
})