import { initAPISpecRoutine, getSpecBasedNamePrefix } from '../../../support/utils'
import { createPolicyGroup, updatePolicyGroup } from '../../../requests/policy-groups-and-policies'
const store = {}


describe('Policies', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))

  //--------------------- Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Create AWS monitoring policy group with OOB policies', () => {
    store.awsMonitoringpolicyName = `${getSpecBasedNamePrefix() + Date.now() + "-AWS-Monitoring"}`
    cy.request(createPolicyGroup({
      // envId: store.envID,
      name: store.awsMonitoringpolicyName,
      engineType: "terraform",
      provider: "aws",
      mode: "monitoring",
      ruleNames: ["kmsCmkNotUsedforXray", "containerDefinitionContainsCLIENT_ID", "lambdaNotEncryptedWithKms", "x509Authentication"],
      version: "v1",
    })).then((response) => {
      expect(response.status).to.eq(200);
      store.awsMonitoringPGID = response.body.id
    })
  });

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Create AWS enforcing policy group with OOB policies', () => {
    cy.request(createPolicyGroup({
      name: `${getSpecBasedNamePrefix() + Date.now() + "-AWS-Enforcing"}`,
      envId: store.envID,
      engineType: "terraform",
      provider: "aws",
      version: "v1",
      benchmark: "AWS Best Practices",
      mode: "enforcing",
      ruleNames: ["kmsCmkNotUsedforXray", "containerDefinitionContainsCLIENT_ID", "lambdaNotEncryptedWithKms", "x509Authentication"]
    })).then((response) => {
      expect(response.status).to.eq(200);
    });
  });

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Update AWS monitoring policy group', () => {
    cy.request(updatePolicyGroup(store.awsMonitoringPGID, {
      envId: store.envID,
      engineType: "terraform",
      provider: "aws",
      name: store.awsMonitoringpolicyName,
      version: "v1",
      benchmark: "AWS Best Practices",
      mode: "monitoring",
      ruleNames: ["ecsServiceAdmin", "notActionNotResource"]
    })).then((response) => {
      expect(response.status).to.eq(200);
    });
  });

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Create azure monitoring policy group with OOB policies', () => {
    store.azureMonitoringPolicyName = `${getSpecBasedNamePrefix() + Date.now() + "-Azure-Monitoring"}`
    cy.request(createPolicyGroup({
      envId: store.envID,
      engineType: "terraform",
      provider: "azure",
      name: store.azureMonitoringPolicyName,
      version: "v1",
      benchmark: "Accurics Security Best Practices for Azure",
      mode: "monitoring",
      ruleNames: ["secretsPolicyAnonymousAccess", "port11215UdpAlbNetworkPortSecurity"]
    })).then((response) => {
      expect(response.status).to.eq(200);
      store.azMonitoingPGID = response.body.id
    });
  });

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('Create azure enforcing policy group with OOB policies', () => {
    cy.request(createPolicyGroup({
      name: `${getSpecBasedNamePrefix() + Date.now() + "-Azure-Enforcing"}`,
      envId: store.envID,
      engineType: "terraform",
      provider: "azure",
      version: "v1",
      benchmark: "Accurics Security Best Practices for Azure",
      mode: "enforcing",
      ruleNames: ["secretsPolicyAnonymousAccess", "port11215UdpAlbNetworkPortSecurity"]
    })).then((response) => {
      expect(response.status).to.eq(200);
    });
  });

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('Update azure monitoring policy group with OOB policies', () => {
    cy.request(updatePolicyGroup(store.azMonitoingPGID, {
      name: store.azureMonitoringPolicyName,
      envId: store.envID,
      engineType: "terraform",
      provider: "azure",
      version: "v1",
      benchmark: "Accurics Security Best Practices for Azure",
      mode: "monitoring",
      ruleNames: ["networkPort5432ExposedToInternetUAz"]
    })).then((response) => {
      expect(response.status).to.eq(200);
    });
  });

  /**--------------------------------------------------------
 * Added by: Spat
 * Test Management ID:
---------------------------------------------------------*/
  it('Create GCP monitoring policy group with OOB policies', () => {
    store.gcpMonitoringpolicyName = `${getSpecBasedNamePrefix() + Date.now() + "-GCP-Monitoring"}`
    cy.request(createPolicyGroup({
      envId: store.envID,
      engineType: "terraform",
      provider: "gcp",
      name: store.gcpMonitoringpolicyName,
      version: "v1",
      benchmark: "Accurics Security Best Practices for GCP",
      mode: "monitoring",
      ruleNames: ["networkPort139ExposedToInternetGCP", "networkPort110ExposedToInternetGCP"]
    })).then((response) => {
      store.gcpMonitoingPGID = response.body.id
      expect(response.status).to.eq(200);
    });
  });

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('Create azure enforcing policy group with OOB policies', () => {
    cy.request(createPolicyGroup({
      name: `${getSpecBasedNamePrefix() + Date.now() + "-GCP-Enforcing"}"`,
      envId: store.envID,
      engineType: "terraform",
      provider: "gcp",
      version: "v1",
      benchmark: "Accurics Security Best Practices for GCP",
      mode: "enforcing",
      ruleNames: ["networkPort139ExposedToInternetGCP", "networkPort110ExposedToInternetGCP"]
    })).then((response) => {
      expect(response.status).to.eq(200);
    });
  });

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('Update gcp monitoring policy group with OOB policies', () => {
    cy.request(updatePolicyGroup(store.gcpMonitoingPGID, {
      envId: store.envID,
      engineType: "terraform",
      provider: "gcp",
      name: store.gcpMonitoringpolicyName,
      version: "v1",
      benchmark: "Accurics Security Best Practices for GCP",
      mode: "monitoring",
      ruleNames: ["networkPort139ExposedToInternetGCP", "networkPort110ExposedToInternetGCP"]
    })).then((response) => {
      expect(response.status).to.eq(200);
    });
  });
})
