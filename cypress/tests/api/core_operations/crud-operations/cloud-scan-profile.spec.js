import { getCloudScanProfiles, updateCloudScanProfile, deleteCloudScanProfile, createProjectWithDefaultPolicies, createCloudScanProfile } from '../../../../requests/projects';
import { initAPISpecRoutine, getSpecBasedNamePrefix, _threeSeconds } from '../../../../support/utils'

const store = {
    envName: `${getSpecBasedNamePrefix() + Date.now()}`
}

describe('Verify CS Profile CRUD operations', () => {
    // Login before the spec initiates
    before(() => initAPISpecRoutine('before'))
    after(()=> initAPISpecRoutine('after'))

    //--------------------- Tests start here ------------------------
    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    const providers = ["aws","gcp","azure"]
    const resTypesToUpdate = [
        ["globalaccelerator","route_table","route53"],
        ["forwardingRules","instances"],
        ["network_interface","network_security_group","virtual_network"]
    ]

    providers.forEach((p, index) => {
        it(`DEMO - MUST - Validate ${p} CS profile lifecycle`, () => {
            //Create project
            createProjectWithDefaultPolicies(getSpecBasedNamePrefix() + Date.now() + "_" + p, p)
            cy.get("@createProjectWithDefaultPolicy_ID").then((response) => {
                store.envID = response
            })
                .then(validateDefaultProfile => {
                    // letsWait("waiting for the project to soak..",_threeSeconds)
                    // Validate whether default cs profile exists
                    cy.request(getCloudScanProfiles(store.envID)).then(csProfileResp => {
                        if (p === 'azure') {
                            expect(csProfileResp.body.find(profiles => profiles.name === `System default Azure cloud scan profile`).system_created).to.eq(true)
                        }
                        else {
                            expect(csProfileResp.body.find(profiles => profiles.name === `System default ${p.toUpperCase()} cloud scan profile`).system_created).to.eq(true)
                        }
                    })
                })
                .then(validateCreateCSProfile => {
                    // Validate new cs profile lifecycle
                    cy.request(createCloudScanProfile(store.envID, { is_default: false, name: store.envName, options: { resource_types: Cypress.env(`${p.toLowerCase()}CloudResourcesToBeScannedWithProfile`), "vm_assess_opts": [] } }))
                        .then(response => {
                            expect(response.status).to.eq(200)
                            store.csProfileID = response.body.profile_id
                        })
                })
                .then(tryUpdatingCSProfile => {
                    cy.request(updateCloudScanProfile(store.envID, store.csProfileID, { is_default: false, name: store.envName + '-NewName', options: { resource_types: resTypesToUpdate[index], "vm_assess_opts": ["host"] } }))
                        .then(response => {
                            expect(response.status).to.eq(200)
                        })
                })
                .then(validateResourcesInTheProfile => {
                    cy.request(getCloudScanProfiles(store.envID)).then(csProfileResp => {
                        expect(csProfileResp.body.find(profiles => profiles.profile_id === store.csProfileID).options.resource_types.sort()).to.have.all.members(resTypesToUpdate[index].sort())
                    })
                })
                .then(tryDeletingCSProfile => {
                    cy.request(deleteCloudScanProfile(store.envID, store.csProfileID))
                        .then(response => {
                            expect(response.status).to.eq(200)
                        })
                })
        })
    })













})