import { doIaCScan } from '../../../requests/projects'
import { onboardRepoToProject, getRepoIdsForProject, waitForRepoStatusReady, getGlobalResourcesData } from '../../../requests/repositoriesAndResources'
import { initAPISpecRoutine, getSpecBasedNamePrefix, letsWait, _tenSeconds } from '../../../support/utils'
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper'
const store = {
  envName: `${getSpecBasedNamePrefix() + Date.now()}`,
  awsProfileInjectEnv: `${getSpecBasedNamePrefix() + "AWS-PROFILE-INJECTION-" + Date.now()}`,
  roleArn: 'arn:aws:iam::536274239938:role/orgNameio-connector_dev', region: 'ca-central-1'
}

describe('Validate bug fixes', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))

  //--------------------- Tests start here ------------------------
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   * TODO: YET TO CREATE INFRA FOR THIS IN orgName INFRA
   * TODO: ONCE INFRA IS CREATED MOVE THIS TEST TO TFSTATE VALIDATION SPEC
  ---------------------------------------------------------*/
  // it('MUST - APE-363: Validate IaC to cloud resource mapping by reading tfstate from s3 by assuming IaM role', () => {
  //   cy.request(onboardRepoToProject({
  //     envs: [{ name: store.envName + "-ape-363", provider: "aws", botIds: [] }],
  //     repos: [
  //       { provider: "aws", url: `https://bitbucket.org/ac10qa-org1/aws-two-tier-modules-env-with-folder.git`, name: `https://bitbucket.org/ac10qa-org1/aws-two-tier-modules-env-with-folder.git-${store.envName.toLowerCase()}-ape-363`, engineType: "terraform", config: [{ key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "false" }, { key: "TFSTATE_URL", value: "s3://accurics-engineering-test-bucket1/aws-two-tier-modules-env-with-folder/terraform.tfstate" }, { key: "TFSTATE_ASSUME_ROLE_ARN", value: "arn:aws:iam::333567660568:role/s3BucketReadAccessTFState" }, { key: "BUCKET_REGION", value: `us-west-1` }], folderPath: "/myenv" }],
  //   })).then(response => {
  //     expect(response.status).to.eq(202)
  //     expect(response.body[0].id).to.not.be.empty
  //     store.ape363EnvID = response.body[0].id
  //   })
  //     .then(createCloudAccount => {
  //       cy.request(onboardCloudAccount(
  //         Cypress.env("awsRoleARN"),
  //         Cypress.env("awsExternalID"),
  //         Cypress.env("awsGroupID"),
  //         "public"
  //       )).then(response => {
  //         expect(response.status).to.eq(202)
  //         store.awsCloudAccountID = response.body[0].id
  //       })
  //     })
  //     .then(connectCloudAccountToTheProject => {
  //       cy.request(updateEnv(
  //         {
  //           "id": store.ape363EnvID, "cloudAccountID": { [store.awsCloudAccountID]: { vpcId: Cypress.env("awsVPCID"), region: Cypress.env("awsRegion") } }
  //         }
  //       )).then(response => {
  //         expect(response.status).to.eq(204)
  //       })
  //     })
  //     .then(() => {
  //       letsWait("wait for the project to soak...", _tenSeconds)
  //       cy.request(getRepoIdsForProject(store.ape363EnvID)).then(response => {
  //         store.ape363RepoID = response.body.repoIds
  //       })
  //     })
  //     .then(() => {
  //       // Run IaC Scan
  //       cy.request(doIaCScan(store.ape363EnvID)).then(response => {
  //         expect(response.status).to.eq(202)
  //         waitForRepoStatusReady(store.ape363RepoID[0])
  //       })
  //     })
  //     .then(() => {
  //       // Run Cloud Scan
  //       cy.request(doCloudScan(store.ape363EnvID, "s3,sg,subnet,vpc,ec2_instance,igw")).then(response => {
  //         expect(response.status).to.eq(202)
  //         waitForCloudScanToFinish(store.ape363EnvID, store.envName + "-ape-363")
  //       })
  //     })
  //     .then(() => {
  //       // Validate the resources
        // cy.request(getGlobalResourcesData(`environmentId=${store.ape363EnvID}&hasState=true&hasIac=true&mapped=true`)).then(response => {
  //         expect(response.body.total).to.be.above(0)
  //       })
  //     })
  // })


  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - APE-8065: Plan-based - Validate IaC scan when repo. points to terraform cloud module', () => {
    cy.request(onboardRepoToProject({
      envs: [{ name: store.envName + "-ape-8065-planned", provider: "aws", botIds: [] }],
      repos: [
        { provider: "aws", url: getUrlByName("NAU_013"), name: getUrlByName("NAU_013").replace('https://bitbucket.org/tenb-qa/', '')+`-${store.envName.toLowerCase()}-ape-8065-planned`, engineType: "terraform", config: [{ key: "TFC_HOST_NAME", value: "app.terraform.io" }, { key: "TFC_USER_TOKEN", value: "AveyMMNIOY5eAA.atlasv1.acBFDIkICdR4RWk1YpEs42yS1XaXIyZejWy6yWyyvhc51v2VLQQza2b6HZxvomyKAgE" }, { key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "false" }], folderPath: "/", "autoRemediate": "none", "source": getUrlByName("NAU_013").replace('https://bitbucket.org/', '') }],
    })).then(response => {
      expect(response.status).to.eq(202)
      expect(response.body[0].id).to.not.be.empty
      store.ape8065EnvID = response.body[0].id
    })
      .then(() => {
        letsWait("wait for the project to soak...", _tenSeconds)
        cy.request(getRepoIdsForProject(store.ape8065EnvID)).then(response => {
          store.ape8065RepoID = response.body.repoIds
        })
      })
      // .then(createCloudAccount => {
      //   cy.request(onboardCloudAccount(
      //       Cypress.env("awsRoleARN"),
      //       Cypress.env("awsExternalID"),
      //       Cypress.env("awsGroupID"),
      //       "public"
      //   )).then(response => {
      //     expect(response.status).to.eq(202)
      //     store.awsCloudAccountID = response.body[0].id
      //   })
      // })
      // .then(connectCloudAccountToTheProject => {
      //   cy.request(updateEnv(
      //     {
      //       "id": store.ape8065EnvID, "cloudAccountID": { [store.awsCloudAccountID]: { vpcId: Cypress.env("awsVPCID"), region: Cypress.env("awsRegion") } }
      //     }
      //   )).then(response => {
      //     expect(response.status).to.eq(204)
      //   })
      // })
      .then(runIaCScan => {
        cy.request(doIaCScan(store.ape8065EnvID)).then(response => {
          expect(response.status).to.eq(202)
          waitForRepoStatusReady(store.ape8065RepoID[0])
          letsWait("wait some more time...", _tenSeconds)
        })
      })
      .then(validateTheResources => {
        cy.request(getGlobalResourcesData(`environmentId=${store.ape8065EnvID}&hasIac=true`)).then(response => {
          expect(response.body.count).to.be.above(4)
        })
      })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - APE-8065: Non-Plan-based - Validate IaC scan when repo. points to terraform cloud module', () => {
    cy.request(onboardRepoToProject({
      envs: [{ name: store.envName + "-ape-8065-unplanned", provider: "aws", botIds: [] }],
      repos: [
        { provider: "aws", url: getUrlByName("NAU_013"), name: getUrlByName("NAU_013")+`-${store.envName.toLowerCase()}-ape-8065-unplanned`, engineType: "terraform", config: [{ key: "TFC_HOST_NAME", value: "app.terraform.io" }, { key: "TFC_USER_TOKEN", value: "AveyMMNIOY5eAA.atlasv1.acBFDIkICdR4RWk1YpEs42yS1XaXIyZejWy6yWyyvhc51v2VLQQza2b6HZxvomyKAgE" }, { key: "TERRAFORM_VERSION", value: Cypress.env("tf_version_for_aws_repos") }, { key: "TERRASCAN", value: "true" }], folderPath: "/", "autoRemediate": "none", "source": getUrlByName("NAU_013").replace('https://bitbucket.org/', '') }],
    })).then(response => {
      expect(response.status).to.eq(202)
      expect(response.body[0].id).to.not.be.empty
      store.ape8065EnvID = response.body[0].id
    })
      .then(() => {
        letsWait("wait for the project to soak...", _tenSeconds)
        cy.request(getRepoIdsForProject(store.ape8065EnvID)).then(response => {
          store.ape8065RepoID = response.body.repoIds
        })
      })
      .then(() => {
        // Run IaC Scan
        cy.request(doIaCScan(store.ape8065EnvID)).then(response => {
          expect(response.status).to.eq(202)
          waitForRepoStatusReady(store.ape8065RepoID[0])
          letsWait("wait some more time...", _tenSeconds)
        })
      })
      .then(() => {
        // Validate the resources
        cy.request(getGlobalResourcesData(`environmentId=${store.ape8065EnvID}&hasIac=true`)).then(response => {
          expect(response.body.count).to.be.above(4)
        })
      })
  })

  // ------------------------BAM BOT + AWS_PROFILE_INJECTION -----------------------------
  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
   * Status: CAN NOT BE TESTED AS orgName SRE HAS REMOVED AKEY SKEY ACCESS
   ---------------------------------------------------------*/
  //  it('MUST - AWS - BAM usecase - create onpremise terraform repository with aws profile injection', () => {
  //   cy.request(onboardRepoToProject({
  //     envs:[{name:store.envName,provider:"aws",botIds:[Cypress.env('botID')]}],
  //     repos:[
  //       { 
  //         provider:"aws",url:`https://csup-ghe-accurics.centralus.cloudapp.azure.com/ac10qa-org1/accurics-aws-profile-bam.git`,name:`accurics-aws-profile-bam-bot.git_${new Date().getTime()}`,engineType:"terraform",config:[{key:"ON_PREM",value:"true"},{key:"REPO_TYPE",value:"github"},{key:"TERRAFORM_VERSION",value:Cypress.env("tf_version_for_aws_repos")},{key:"TERRASCAN",value:"false"},
  //         { key: "AWS_CREDENTIALS_FILE",value: "[stage]\naws_access_key_id = AKIA3K6OCMMIQVIXNNAS\naws_secret_access_key = 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\n[dev]\naws_access_key_id = AKIA3K6OCMMIQVIXNNAS\naws_secret_access_key = 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"},
  //         { key: "TFSTATE_URL",value: "s3://accurics-engineering-test-bucket1/accurics-aws-profile-bam/terraform.tfstate"},
  //         { key: "TFSTATE_ASSUME_ROLE_ARN",value: Cypress.env("awsRoleARN") },
  //         { key: "BUCKET_REGION",value: Cypress.env("awsRegion") },  
  //     ],folderPath:"/",autoRemediate:"none",source:`ac10qa-org1/accurics-aws-profile-bam.git`},]
  //   })).then(response => {
  //     expect(response.status).to.eq(202)
  //     expect(response.body[0].id).to.not.be.empty
  //     store.awsProfileInjectEnvID = response.body[0].id
  //   })
  //   .then(createCloudAccount => {
  //     cy.request(onboardCloudAccount(
  //       Cypress.env("awsRoleARN"),
  //       "",
  //       Cypress.env("awsGroupID"),
  //       "public"
  //     )).then(response => {
  //       expect(response.status).to.eq(202)
  //       store.awsCloudAccountID = response.body[0].id
  //     })
  //   })
  //   .then(connectCloudAccountToTheProject => {
  //     cy.request(updateEnv(
  //       {
  //         "id": store.awsProfileInjectEnvID, "cloudAccountID": { [store.awsCloudAccountID]: { vpcId: Cypress.env("awsVPCID"), region: Cypress.env("awsRegion") } }
  //       }
  //     )).then(response => {
  //       expect(response.status).to.eq(204)
  //     })
  //   })
  //   .then((getTheRepoId) => {
  //     letsWait("wait for the project to soak...", _tenSeconds)
  //     cy.request(getRepoIdsForProject(store.awsProfileInjectEnvID)).then(response => {
  //       store.repoIDs = response.body.repoIds
  //     })
  //     .then(scanProject => {
  //       cy.request(doIaCScan(store.awsProfileInjectEnvID)).then(response => {
  //         expect(response.status).to.eq(202)
  //       }).then(waitForReposToBeScanned => {
  //         waitForBotStatus(Cypress.env('botID'), "BOT_PROCESSING_JOB")
  //         waitForRepoStatusReady(store.repoIDs[0])
  //       })
  //   })
  //   .then(() => {   
  //     // Validate the resources
  //  cy.request(getGlobalResourcesData(`environmentId=${store.awsProfileInjectEnvID}&hasState=true&hasIac=true&mapped=true`)).then(response => {
  //         expect(response.body.total).to.be.above(0)
  //       })
  //     })
  //   })
  // })

















})