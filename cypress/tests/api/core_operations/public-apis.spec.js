import {
  waitForCloudScanToFinish, verifyAWSResourceMapping, updateEnv, 
  getProjectDetails, createCloudScanProfile, doCloudScanThroughProfile, getFilteredViolations,
  getProjectCloudAccountAssociations, ignoreUnIgnoreIaCResourceMisconfiguration
} from '../../../requests/projects'
import {
  publicGetPRDetails, publicCreatePRs, publicGetIaCScanDetails, publicScanRepo,
  publicGetRepoDetails, publicOnboardRepoToProject, publicGetResourceDetails,
  publicGetDriftsDetails, publicGetViolationTypes,
  publicCreateProject, publicGetProjects, publicGetSpecificProject,
  publicGetRepoList, publicCreateException, publicListExceptions, publicDeleteException, 
  publicGetExceptionDetails, publicUpdateException, publicGetMetricsDetails,
  publicCreateCloudAccount, publicFetchCloudAccount, publicUpdateCloudAccount, publicConfigureCloudAccount
} from '../../../requests/public-apis'
import { createAPIAuthToken } from '../../../requests/integrations'
import { initAPISpecRoutine, getSpecBasedNamePrefix, arrayCheckerForPartialMatch, _sixtySeconds, _threeSeconds, _fifteenSeconds, letsWait, _twentySeconds, _tenSeconds } from '../../../support/utils'
import 'cypress-wait-until';
import { getUrlByName } from '../../../requests/apiAndNonApiUrlsMapper';
import { getMemberCloudAccounts } from '../../../requests/cloudAccounts'
import { cloudCredentialsGenerator } from '../../../support/utils'
import { getGlobalResourcesData } from '../../../requests/repositoriesAndResources';

const store = {
  envName: `${getSpecBasedNamePrefix() + Date.now()}`
}

describe('External APIs (HUMANA)', () => {
  before(() => initAPISpecRoutine('before'))
  after(() => initAPISpecRoutine('after'))

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Create Accurics API Auth Token', () => {
    cy.request(createAPIAuthToken())
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.appToken.length).to.eq(36)
      store.apiAuthToken = response.body.appToken
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
   ---------------------------------------------------------*/
  it('MUST - AWS - Create Project', () => {
    cy.request(publicCreateProject({
      cloud_provider: "aws",
      name: store.envName,
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.id).to.not.be.empty
      store.project_id = response.body.id
    })
  })

  /**--------------------------------------------------------
   * Added by: Raja
   * Test Management ID:
   ---------------------------------------------------------*/
  it('MUST - Container - Create Project', () => {
    cy.request(publicCreateProject({
      cloud_provider: "container",
      name: store.envName + "-container",
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.id).to.not.be.empty
      store.container_project_id = response.body.id
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
   ---------------------------------------------------------*/
  it('MUST - AWS - Get Project', () => {
    let consecProjectName = "DND-Consec-Pipeline-API-Tests"
    cy.request(publicGetProjects(store.apiAuthToken))
    .then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.not.be.empty
      expect(response.body.length).to.be.above(0)
      //added this loop to get project id from projects list instead of static. It will work with milestone and staging
      store.consecProjectID = response.body.filter(function (project) {
        return project.name == consecProjectName;
      })[0].id;
      expect(store.consecProjectID).to.not.be.null
    })
  })

  /**--------------------------------------------------------
   * Added by: Arti
   * Test Management ID:
   ---------------------------------------------------------*/
  it('MUST - AWS - Get Project with ID', () => {
    cy.request(publicGetSpecificProject(store.project_id, store.apiAuthToken))
    .then((response) => {
      store.cloud_provider = response.body[0].cloud_provider
      expect(response.status).to.eq(200)
      expect(response.body[0].name).to.include(getSpecBasedNamePrefix("-pipeline-api"))
    })
    .then((getContainerProjectDetails) => {
      cy.request(publicGetSpecificProject(store.container_project_id, store.apiAuthToken))
      .then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body[0].name).to.include(getSpecBasedNamePrefix("-container"))
        expect(response.body[0].image_resource_count).to.gte(0)
        expect(response.body[0].image_policy_violation_count).to.gte(0)
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: Spat
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - AWS - Create and scan repo, raise PRs and validate', () => {
    cy.request(publicOnboardRepoToProject({
      url: getUrlByName("NAU_008"),
      name: getUrlByName("NAU_008").replace('https://bitbucket.org/tenb-qa/', '') + "-" + store.envName.toLowerCase(),
      branch: "master",
      iac_engine_type: "default_engine",
      directory_path: "/",
      cloud_provider: store.cloud_provider,
      auto_remediate: true,
      project: store.project_id
    }, store.apiAuthToken)).then(response => {
      expect(response.status).to.eq(201)
      expect(response.body.id).to.not.be.empty
      store.awsRepo1ID = response.body.id
    })
      .then(validateRepoDetails => {
        cy.request(publicGetRepoDetails(store.awsRepo1ID, store.apiAuthToken))
        .then(
          response => {
            expect(response.status).to.eq(200)
            expect(response.body.id).to.eq(store.awsRepo1ID)
          }
        )
      })
      .then(runIaCScan => {
        cy.request(publicScanRepo(store.awsRepo1ID, store.apiAuthToken))
        .then(response => {
          expect(response.body.id).to.not.be.empty
          store.repo_scan_id = response.body.id
        })
      })
      .then(validateScanStatus => {
        cy.waitUntil(() => cy.request(publicGetIaCScanDetails(store.repo_scan_id, store.apiAuthToken))
        .then(response => response.body.scan_status === "COMPLETE"), {
          errorMsg: 'IaC scan could not complete within time.', // overrides the default error message
          timeout: _sixtySeconds,
          interval: _threeSeconds
        });
      })
      .then(createPR => {
        cy.request(publicCreatePRs(store.repo_scan_id, store.project_id, store.apiAuthToken))
        .then(response => {
        })
      })
      .then(validatePRDetails => {
        letsWait(`Waiting for PRs to be generated.`, _fifteenSeconds)
        cy.request(publicGetPRDetails(store.apiAuthToken))
        .then(response => {
          expect(response.status).to.eq(200)
          //Check whether at lease one PR has been raised
          expect(response.body.length).to.be.above(0)
          expect(response.body[0].title).to.include("Auto Generated Pull Request from Accurics")
        })
      })
  })

  it('MUST - AWS - Create and scan repo, do cloud scan and validate resources, drifts, violations and metrics', () => {
    cy.request(publicOnboardRepoToProject({
      url: getUrlByName("NAU_007"),
      name: getUrlByName("NAU_007").replace('https://bitbucket.org/tenb-qa/', '') + "-" + store.envName.toLowerCase(),
      branch: "master",
      iac_engine_type: "terraform",
      directory_path: "/",
      cloud_provider: store.cloud_provider,
      auto_remediate: true,
      project: store.project_id
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(201)
      expect(response.body.id).to.not.be.empty
      store.awsRepo1ID = response.body.id
    })
      .then(onboardCloudAccounttoProject => {
        cy.request(updateEnv(
          {
            id: store.project_id, "cloudAccountID": { [Cypress.env('cloudAccountIDs').aws_536274239938]: { vpcId: Cypress.env("awsVPCID"), region: Cypress.env("awsRegion") } }
          }
        ))
        .then(response => {
          expect(response.status).to.eq(204)
        })
      }
      )
      .then(validateRepoDetails => {
        cy.request(publicGetRepoDetails(store.awsRepo1ID, store.apiAuthToken))
        .then(
          response => {
            expect(response.status).to.eq(200)
            expect(response.body.iac_engine_type).to.eq("terraform")
            expect(response.body.id).to.eq(store.awsRepo1ID)
          }
        )
      })
      .then(runIaCScan => {
        cy.request(publicScanRepo(store.awsRepo1ID, store.apiAuthToken))
        .then(response => {
          expect(response.body.id).to.not.be.empty
          store.repo_scan_id = response.body.id
        })
      })
      .then(validateScanStatus => {
        cy.waitUntil(() => cy.request(publicGetIaCScanDetails(store.repo_scan_id, store.apiAuthToken))
        .then(response => response.body.scan_status === "COMPLETE" || response.body.scan_status === "IAC_SCAN_FAILED"), {
          errorMsg: 'IaC scan could not complete within time.', // overrides the default error message
          timeout: _sixtySeconds,
          interval: _threeSeconds
        });
      })
      .then(runCloudScan => {
        cy.request(createCloudScanProfile(store.project_id, { is_default: false, name: store.envName, options: { resource_types: Cypress.env("awsCloudResourcesToBeScannedWithProfile"), "vm_assess_opts": [] } }))
          .then(response => {
            store.csProfileID = response.body.profile_id
          }).then(runCloudScan => {
            // Run cloud scan
            cy.request(doCloudScanThroughProfile(store.project_id, store.csProfileID))
            .then(response => {
              expect(response.status).to.eq(202)
              waitForCloudScanToFinish(store.project_id, store.envName)
              cy.wait(_sixtySeconds)
              waitForCloudScanToFinish(store.project_id, store.envName)
              cy.wait(_twentySeconds)
              verifyAWSResourceMapping(store.project_id)
              cy.request(getGlobalResourcesData(`environmentId=${store.project_id}&mapped=true`))
              .then(response => {
                expect(response.body.count).to.be.above(3)
              })
            })
          })
      })
      .then(getResourceDetails => {
        cy.request(publicGetResourceDetails({ project_id: store.project_id }, store.apiAuthToken))
        .then((response) => {
          expect(response.status).to.eq(200)
          let types = []
          response.body.forEach((element) => { types.push(element.type) })
          expect(types.includes("aws_lambda_function")).to.true
          expect(types.includes("aws_security_group")).to.true
        })
      })
      .then(getDriftDetails => {
        cy.request(publicGetDriftsDetails({ project_id: store.project_id }, store.apiAuthToken))
        .then((response) => {
          expect(response.status).to.eq(200)
          let driftResourceTypes = []
          response.body.forEach((element) => { driftResourceTypes.push(element.type) })
          expect(arrayCheckerForPartialMatch(Cypress.env("awsExpectedDrifts"), driftResourceTypes)).to.be.true
        })
      })
      .then(getViolationTypes => {
        cy.request(publicGetViolationTypes({
          project_id: store.project_id,
          has_cloud: true
        }, store.apiAuthToken))
        .then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.not.be.empty
          expect(response.body.length).to.be.above(6)
        })
      })
      // Removed the validation for drift because of https://accurics.atlassian.net/browse/APE-10761?focusedCommentId=40085
      // With V2 table implementation drift calculation happens from drift service
      .then(getMetricDetails => {
        cy.request(publicGetSpecificProject(store.project_id, store.apiAuthToken))
        .then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body.iac_resource_count).to.be.above(10)
          expect(response.body.iac_policy_violation_count).to.be.above(20)
        })
      })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - AWS - Create terraform repo and validate', () => {
    cy.request(publicOnboardRepoToProject({
      url: getUrlByName("NAU_008"),
      name: getUrlByName("NAU_008").replace('https://bitbucket.org/tenb-qa/', '') + "-" + store.envName.toLowerCase(),
      branch: "master",
      iac_engine_type: "terraform",
      directory_path: "/",
      cloud_provider: store.cloud_provider,
      auto_remediate: true,
      project: store.project_id
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(201)
      expect(response.body.id).to.not.be.empty
      store.awsRepo1ID = response.body.id
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - AWS - Get repo list', () => {
    cy.request(publicGetRepoList(undefined, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body).to.not.be.empty
      expect(response.body.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - AWS - Get repo list by project id and url', () => {
    cy.request(publicGetRepoList({
      project: store.project_id,
      url: getUrlByName("NAU_008")
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body).to.not.be.empty
      expect(response.body.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
     * Added by: tlikhar
     * Test Management ID:
    ---------------------------------------------------------*/
  it('MUST - Create local exception', () => {
    cy.request(publicCreateException({
      global: false,
      effective_date: new Date().toJSON(),
      duration: 20,
      category: "Risk Accepted",
      policy_id: "AC_AWS_0132",
      comments: "test"
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.id).to.not.be.empty
      store.exception_id = response.body.id
    })
  })

  /**--------------------------------------------------------
     * Added by: tlikhar
     * Test Management ID:
    ---------------------------------------------------------*/
  it('MUST - Create project exception', () => {
    cy.request(publicCreateProject({
      cloud_provider: store.cloud_provider,
      name: store.envName + 'project_exception',
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.id).to.not.be.empty
      store.exception_project_id = response.body.id
    }).then(onboardRepoToProject => {
      cy.request(publicOnboardRepoToProject({
        url: getUrlByName("NAU_008"),
        name: getUrlByName("NAU_008").replace('https://bitbucket.org/tenb-qa/', '') + "-" + store.envName.toLowerCase(),
        branch: "master",
        iac_engine_type: "default_engine",
        directory_path: "/",
        cloud_provider: store.cloud_provider,
        auto_remediate: true,
        project: store.exception_project_id
      }, store.apiAuthToken))
      .then(response => {
        expect(response.status).to.eq(201)
        expect(response.body.id).to.not.be.empty
        store.awsRepo1ID = response.body.id
      })
    }).then(validateRepoDetails => {
      cy.request(publicGetRepoDetails(store.awsRepo1ID, store.apiAuthToken))
      .then(
        response => {
          expect(response.status).to.eq(200)
          expect(response.body.id).to.eq(store.awsRepo1ID)
        }
      )
    })
      .then(runIaCScan => {
        cy.request(publicScanRepo(store.awsRepo1ID, store.apiAuthToken))
        .then(response => {
          expect(response.body.id).to.not.be.empty
          store.repo_scan_id = response.body.id
        })
      })
      .then(validateScanStatus => {
        cy.waitUntil(() => cy.request(publicGetIaCScanDetails(store.repo_scan_id, store.apiAuthToken))
        .then(response => response.body.scan_status === "COMPLETE" || response.body.scan_status === "IAC_SCAN_FAILED"), {
          errorMsg: 'IaC scan could not complete within time.', // overrides the default error message
          timeout: _sixtySeconds,
          interval: _threeSeconds
        });
      })
      .then(() => {
        getProjectDetails(store.exception_project_id)
        cy.get('@projDetails')
        .then((res) => {
          store.iacViolations = res.policyViolationsIac;
        })
      })
      .then(validateExceptionStatus => {
        cy.request(publicCreateException({
          project_id: store.exception_project_id,
          effective_date: new Date().toJSON(),
          duration: 1200,
          category: "Risk Accepted",
          policy_id: "AC_AWS_0229",
          comments: "test"
        }, store.apiAuthToken))
        .then(response => {
          expect(response.status).to.eq(200)
          expect(response.body.id).to.not.be.empty
          store.exception_id = response.body.id
        })
      })
      .then(runIaCScan => {
        cy.request(publicScanRepo(store.awsRepo1ID, store.apiAuthToken))
        .then(response => {
          expect(response.body.id).to.not.be.empty
          store.repo_scan_id = response.body.id
        })
      })
      .then(validateScanStatus => {
        cy.waitUntil(() => cy.request(publicGetIaCScanDetails(store.repo_scan_id, store.apiAuthToken))
        .then(response => response.body.scan_status === "COMPLETE"), {
          errorMsg: 'IaC scan could not complete within time.', // overrides the default error message
          timeout: _sixtySeconds,
          interval: _threeSeconds
        });
      })
      .then(validateProjectPolicyViolationCount => {
        cy.request(publicGetSpecificProject(store.exception_project_id, store.apiAuthToken))
        .then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body[0].policy_violation_count).to.be.eq(store.iacViolations - 1)
        })
      })
  })

  /**--------------------------------------------------------
     * Added by: tlikhar
     * Test Management ID:
    ---------------------------------------------------------*/
  it('MUST - Create repository exception without project id', () => {
    cy.request(publicCreateProject({
      cloud_provider: store.cloud_provider,
      name: store.envName + 'repo_exception_without_id1',
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.id).to.not.be.empty
      store.project_id1 = response.body.id
    }).then(createNextProject => {
      cy.request(publicCreateProject({
        cloud_provider: store.cloud_provider,
        name: store.envName + 'repo_exception_without_id2',
      }, store.apiAuthToken))
      .then(response => {
        expect(response.status).to.eq(200)
        expect(response.body.id).to.not.be.empty
        store.project_id2 = response.body.id
      })
    }).then(onboardRepoToProject1 => {
      cy.request(publicOnboardRepoToProject({
        url: getUrlByName("NAU_008"),
        name: getUrlByName("NAU_008").replace('https://bitbucket.org/tenb-qa/', '') + "-" + store.envName.toLowerCase(),
        branch: "master",
        iac_engine_type: "default_engine",
        directory_path: "/",
        cloud_provider: store.cloud_provider,
        auto_remediate: true,
        project: store.project_id1
      }, store.apiAuthToken))
      .then(response => {
        expect(response.status).to.eq(201)
        expect(response.body.id).to.not.be.empty
        store.awsRepo1ID = response.body.id
      })
    }).then(validateRepoDetails => {
      cy.request(publicGetRepoDetails(store.awsRepo1ID, store.apiAuthToken))
      .then(
        response => {
          expect(response.status).to.eq(200)
          expect(response.body.id).to.eq(store.awsRepo1ID)
        }
      )
    }).then(onboardRepoToProject2 => {
      cy.request(publicOnboardRepoToProject({
        url: getUrlByName("NAU_008"),
        name: getUrlByName("NAU_008").replace('https://bitbucket.org/tenb-qa/', '') + "-" + store.envName.toLowerCase(),
        branch: "master",
        iac_engine_type: "default_engine",
        directory_path: "/",
        cloud_provider: store.cloud_provider,
        auto_remediate: true,
        project: store.project_id2
      }, store.apiAuthToken))
      .then(response => {
        expect(response.status).to.eq(201)
        expect(response.body.id).to.not.be.empty
      })
    }).then(validateRepoDetails => {
      cy.request(publicGetRepoDetails(store.awsRepo1ID, store.apiAuthToken))
      .then(
        response => {
          expect(response.status).to.eq(200)
          expect(response.body.id).to.eq(store.awsRepo1ID)
        }
      )
    }).then(runIaCScan => {
      cy.request(publicScanRepo(store.awsRepo1ID, store.apiAuthToken))
      .then(response => {
        expect(response.body.id).to.not.be.empty
        store.repo_scan_id = response.body.id
      })
    }).then(validateScanStatus => {
      cy.waitUntil(() => cy.request(publicGetIaCScanDetails(store.repo_scan_id, store.apiAuthToken))
      .then(response => response.body.scan_status === "COMPLETE"), {
        errorMsg: 'IaC scan could not complete within time.', // overrides the default error message
        timeout: _sixtySeconds,
        interval: _threeSeconds
      });
    }).then((getProject1Violations) => {
      getProjectDetails(store.project_id1)
      cy.get('@projDetails')
      .then((res) => {
        store.iacViolations1 = res.policyViolationsIac;
      })
    }).then(validateExceptionStatus => {
      cy.request(publicCreateException({
        repo_url: getUrlByName("NAU_008"),
        resource_iac_name: "aws_db_instance.acqatestrdspgsqlone",
        effective_date: new Date().toJSON(),
        duration: 1200,
        category: "Risk Accepted",
        policy_id: "AC_AWS_0053",
        comments: "test"
      }, store.apiAuthToken))
      .then(response => {
        expect(response.status).to.eq(200)
        expect(response.body.id).to.not.be.empty
        store.exception_id = response.body.id
      })
    }).then(runIaCScan => {
      cy.request(publicScanRepo(store.awsRepo1ID, store.apiAuthToken))
      .then(response => {
        expect(response.body.id).to.not.be.empty
        store.repo_scan_id = response.body.id
      })
    }).then(validateScanStatus => {
      cy.waitUntil(() => cy.request(publicGetIaCScanDetails(store.repo_scan_id, store.apiAuthToken))
      .then(response => response.body.scan_status === "COMPLETE"), {
        errorMsg: 'IaC scan could not complete within time.', // overrides the default error message
        timeout: _sixtySeconds,
        interval: _threeSeconds
      });
    }).then(validateProject1PolicyViolationCount => {
      cy.request(publicGetSpecificProject(store.project_id1, store.apiAuthToken))
      .then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body[0].policy_violation_count).to.be.eq(store.iacViolations1 - 1)
      })
    }).then(validateProject2PolicyViolationCount => {
      cy.request(publicGetSpecificProject(store.project_id2, store.apiAuthToken))
      .then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body[0].policy_violation_count).to.be.eq(store.iacViolations1 - 1)
      })
    })
  })

  /**--------------------------------------------------------
     * Added by: tlikhar
     * Test Management ID:
    ---------------------------------------------------------*/
  it('MUST - Create repository exception with project id', () => {
    cy.request(publicCreateProject({
      cloud_provider: store.cloud_provider,
      name: store.envName + 'repo_exception1',
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.id).to.not.be.empty
      store.project_id1 = response.body.id
    }).then(createNextProject => {
      cy.request(publicCreateProject({
        cloud_provider: store.cloud_provider,
        name: store.envName + 'repo_exception2',
      }, store.apiAuthToken))
      .then(response => {
        expect(response.status).to.eq(200)
        expect(response.body.id).to.not.be.empty
        store.project_id2 = response.body.id
      })
    }).then(onboardRepoToProject1 => {
      cy.request(publicOnboardRepoToProject({
        url: getUrlByName("NAU_008"),
        name: getUrlByName("NAU_008").replace('https://bitbucket.org/tenb-qa/', '') + "-" + store.envName.toLowerCase(),
        branch: "master",
        iac_engine_type: "default_engine",
        directory_path: "/",
        cloud_provider: store.cloud_provider,
        auto_remediate: true,
        project: store.project_id1
      }, store.apiAuthToken))
      .then(response => {
        expect(response.status).to.eq(201)
        expect(response.body.id).to.not.be.empty
        store.awsRepo1ID = response.body.id
      })
    }).then(validateRepoDetails => {
      cy.request(publicGetRepoDetails(store.awsRepo1ID, store.apiAuthToken))
      .then(
        response => {
          expect(response.status).to.eq(200)
          expect(response.body.iac_engine_type).to.eq("terraform")
          expect(response.body.id).to.eq(store.awsRepo1ID)
        }
      )
    }).then(onboardRepoToProject2 => {
      cy.request(publicOnboardRepoToProject({
        url: getUrlByName("NAU_008"),
        name: getUrlByName("NAU_008").replace('https://bitbucket.org/tenb-qa/', '') + "-" + store.envName.toLowerCase(),
        branch: "master",
        iac_engine_type: "default_engine",
        directory_path: "/",
        cloud_provider: store.cloud_provider,
        auto_remediate: true,
        project: store.project_id2
      }, store.apiAuthToken))
      .then(response => {
        expect(response.status).to.eq(201)
        expect(response.body.id).to.not.be.empty
      })
    }).then(validateRepoDetails => {
      cy.request(publicGetRepoDetails(store.awsRepo1ID, store.apiAuthToken))
      .then(
        response => {
          expect(response.status).to.eq(200)
          expect(response.body.id).to.eq(store.awsRepo1ID)
        }
      )
    }).then((removeAllExceptions) => {
      cy.request(publicListExceptions({
        project_id: store.project_id
      }, store.apiAuthToken))
      .then(response => {
        expect(response.status).to.eq(200)
        expect(response.body.length).to.be.above(0)
        store.exception_ids = response.body.map(({ id }) => id)
      }).then(deleteExceptionIds => {
        store.exception_ids.forEach((exception_id) => {
          cy.log(`Deleting exception id: ${exception_id}`)
          cy.request(publicDeleteException(exception_id, store.apiAuthToken))
        })
      })
    }).then(runIaCScan => {
      cy.request(publicScanRepo(store.awsRepo1ID, store.apiAuthToken))
      .then(response => {
        expect(response.body.id).to.not.be.empty
        store.repo_scan_id = response.body.id
      })
    }).then(validateScanStatus => {
      cy.waitUntil(() => cy.request(publicGetIaCScanDetails(store.repo_scan_id, store.apiAuthToken))
      .then(response => response.body.scan_status === "COMPLETE"), {
        errorMsg: 'IaC scan could not complete within time.', // overrides the default error message
        timeout: _sixtySeconds,
        interval: _threeSeconds
      });
    }).then((getProject1Violations) => {
      getProjectDetails(store.project_id1)
      cy.get('@projDetails')
      .then((res) => {
        store.iacViolations1 = res.policyViolationsIac;
      })
    }).then((getProject2Violations) => {
      getProjectDetails(store.project_id2)
      cy.get('@projDetails')
      .then((res) => {
        store.iacViolations2 = res.policyViolationsIac;
      })
    })
    .then(validateExceptionStatus => {
      cy.request(publicCreateException({
        project_id: store.project_id1,
        repo_url: getUrlByName("NAU_008"),
        resource_iac_name: "aws_db_instance.acqatestrdspgsqlone",
        effective_date: new Date().toJSON(),
        duration: 1200,
        category: "Risk Accepted",
        policy_id: "AC_AWS_0053",
        comments: "test"
      }, store.apiAuthToken))
      .then(response => {
        expect(response.status).to.eq(200)
        expect(response.body.id).to.not.be.empty
        store.exception_id = response.body.id
      })
    }).then(runIaCScan => {
      cy.request(publicScanRepo(store.awsRepo1ID, store.apiAuthToken))
      .then(response => {
        expect(response.body.id).to.not.be.empty
        store.repo_scan_id = response.body.id
      })
    })
    .then(validateScanStatus => {
      cy.waitUntil(() => cy.request(publicGetIaCScanDetails(store.repo_scan_id, store.apiAuthToken))
      .then(response => response.body.scan_status === "COMPLETE"), {
        errorMsg: 'IaC scan could not complete within time.', // overrides the default error message
        timeout: _sixtySeconds,
        interval: _threeSeconds
      });
    })
    .then(validateProject1PolicyViolationCount => {
      cy.request(publicGetSpecificProject(store.project_id1, store.apiAuthToken))
      .then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body[0].policy_violation_count).to.be.eq(store.iacViolations1 - 1)
      })
    })
    .then(validateProject2PolicyViolationCount => {
      cy.request(publicGetSpecificProject(store.project_id2, store.apiAuthToken))
      .then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body[0].policy_violation_count).to.be.eq(store.iacViolations2)
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - List exceptions based on project id', () => {
    cy.request(publicListExceptions({
      project_id: store.project_id
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
    * Added by: tlikhar
    * Test Management ID:
   ---------------------------------------------------------*/
  it('MUST - List exceptions based on repo id', () => {
    cy.request(publicListExceptions({
      repo_id: store.awsRepo1ID
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.above(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Get exception details', () => {
    cy.request(publicGetExceptionDetails(store.exception_id, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.id).to.not.be.empty
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Update exception', () => {
    cy.request(publicUpdateException(store.exception_id, {
      comments: 'Changed comment',
      category: 'Not Applicable',
      duration: 60
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body).to.not.be.empty
    }).then(() => {
      cy.request(publicGetExceptionDetails(store.exception_id, store.apiAuthToken))
      .then(response => {
        expect(response.status).to.eq(200)
        expect(response.body.comments).to.be.eq('Changed comment')
        expect(response.body.category).to.be.eq('Not Applicable')
        expect(response.body.duration).to.be.eq(60)
      })
    }
    )
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Delete exception', () => {
    cy.request(publicDeleteException(store.exception_id, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.length).to.be.eq(0)
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Compare metrics api results with TCS api', () => {
    //Get metric details from public api
    cy.request(publicGetMetricsDetails({
      project_id: store.project_id
    }, store.apiAuthToken))
    .then((response) => {
      let metricDetails = response.body.metrics[0]
      store.publicApiIacResources = metricDetails.iac_resources
      store.publicApiIacViolations = metricDetails.iac_violations
      store.publicApiCloudResources = metricDetails.cloud_resources
      store.publicApiCloudViolations = metricDetails.cloud_violations
    })
    .then((validateWithTcsProjectsApi) => {
      getProjectDetails(store.project_id)
      cy.get('@projDetails')
      .then((res) => {
        expect(store.publicApiIacResources).to.eq(res.resourcesIac)
        expect(store.publicApiCloudResources).to.eq(res.resourcesCloud)
        expect(store.publicApiIacViolations).to.eq(res.policyViolationsIac)
        expect(store.publicApiCloudViolations).to.eq(res.policyViolationsCloud)
      })
    })
    //Get metrics details for image type resources
    cy.request(publicGetMetricsDetails({
      project_id: store.consecProjectID
    }, store.apiAuthToken))
    .then((response) => {
      let metricDetails = response.body.metrics[0]
      store.publicApiImageResources = metricDetails.image_resources
      store.publicApiImageViolations = metricDetails.image_violations
    })
    .then((validateWithTcsProjectsApi) => {
      getProjectDetails(store.consecProjectID)
      cy.get('@projDetails')
      .then((res) => {
        expect(store.publicApiImageResources).to.eq(res.resourcesImage)
        expect(store.publicApiImageViolations).to.eq(res.policyViolationsImage)
      })
    })
  })

   /**--------------------------------------------------------
   * Added by: Raja
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Compare resource count of public apis with Tcs apis', () => {
    // Get image resource count from Public api
    cy.request(publicGetResourceDetails({ project_id: store.consecProjectID, has_image: true }, store.apiAuthToken))
    .then((response) => {
      expect(response.status).to.eq(200)
      store.publicImageResourceCount = response.body.length 
    })
    // Get image resource count from internal api
    .then((getImageResourceCountFromInternalApi) => {
      cy.request(getGlobalResourcesData(`environmentId=${store.consecProjectID}&useBaseline=true&hasImage=true`))
      .then(resResponse => {
        expect(resResponse.status).to.eq(200)
        store.internalImageResourceCount = resResponse.body.count
      })
    })
    .then((getPublicIacAndCloudResourceCount) => {
      cy.request(publicGetResourceDetails({ project_id: store.project_id, limit: 500 }, store.apiAuthToken))
      .then((response) => {
        expect(response.status).to.eq(200)
        store.publicResourceCount = response.body.length 
      })
    })
    // Get Iac resource count from internal api
    .then((getIacAndCloudResourceCountFromInternalApi) => {
      cy.request(getGlobalResourcesData(`environmentId=${store.project_id}&useBaseline=true&limit=500`))
      .then(resResponse => {
        expect(resResponse.status).to.eq(200)
        store.internalResourceCount = resResponse.body.resources.length
      })
    })
    // Compare resource count of public apis with Tcs apis
    .then((compareImageResourceCounts) => {
      expect(store.publicImageResourceCount).to.eq(store.internalImageResourceCount)
      expect(store.publicResourceCount).to.eq(store.internalResourceCount)   
    })
  })

  /**--------------------------------------------------------
   * Added by: Raja
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Compare ignored violations results with TCS api', () => {
    //Get misconfiguration details
    cy.request(getGlobalResourcesData(`environmentId=${store.project_id}&useBaseline=true&limit=1&offset=0&type=aws_s3_bucket&hasIac=true`))
    .then(resResponse => {
      expect(resResponse.status).to.eq(200)
      store.targetViolationSlug = resResponse.body.resources[0].violations[0].violation.violationSlug
      store.targetAccuricsIds = [resResponse.body.resources[0].accuricsId]
    })
    // Ignore Misconfiguration
    .then((ignoreMisconfiguration) => {
      cy.request(ignoreUnIgnoreIaCResourceMisconfiguration(store.project_id, store.targetViolationSlug,
        { ignore:true, reason:store.project_id, category:'Applicable Risk',accuricsIds: store.targetAccuricsIds ,expiresAfter:null}))
      .then(response => {
        expect(response.status).to.eq(200)
      })
    })
    //Get ignored misconfig from internal violations api  
    .then((getIgnoredMisconfigsFromInternalApi) => {
      letsWait("wait for ignored misconfigs go through...", _tenSeconds)
      cy.request(getFilteredViolations(store.project_id,"&hasViolation=true&showIgnored=true"))
      .then(resResponse => {
        expect(resResponse.status).to.eq(200)
        store.ignoredMisconfigurationsFromInternalApi = resResponse.body.types.length
      })
    })
    //Get ignored misconfig from public api 
    .then((getIgnoredMisconfigsFromPublicApi) => {
      cy.request(publicGetViolationTypes({ project_id: store.project_id, show_ignored: true }, store.apiAuthToken))
      .then((response) => { store.ignoredMisconfigurationsFromPublicApi = response.body.length })
    })
    //Compare ignored misconfiguration between internal and public apis.
    .then((compareIgnoredMisconfigurations) => {
      expect(store.ignoredMisconfigurationsFromPublicApi).to.eq(store.ignoredMisconfigurationsFromInternalApi)
    })
  })
  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Compare violations api results with TCS api', () => {
    //Get cloud violations from public api
    cy.request(publicGetViolationTypes({
      project_id: store.project_id,
      has_cloud: true
    }, store.apiAuthToken))
      .then((response) => { store.publicApiCloudViolations = response.body.length })
      .then((getIacViolationsPublicApi) => {
        cy.request(publicGetViolationTypes({ project_id: store.project_id, has_iac: true }, store.apiAuthToken))
        .then((response) => { store.publicApiIacViolations = response.body.length })
      })
      .then((getImageViolationsPublicApi) => {
        cy.request(publicGetViolationTypes({ project_id: store.consecProjectID, has_image: true }, store.apiAuthToken))
        .then((response) => { store.publicApiImageViolations = response.body.length })
      })
      .then((validateImageViolationsWithTcsProjectsApi) => {
        getProjectDetails(store.consecProjectID)
        cy.get('@projDetails')
        .then((res) => {
          expect(store.publicApiImageViolations).to.eq(res.policyViolationsImage)
        })
      })
      .then((validateWithTcsProjectsApi) => {
        getProjectDetails(store.project_id)
        cy.get('@projDetails')
          .then((res) => {
            expect(store.publicApiIacViolations).to.eq(res.policyViolationsIac)
            expect(store.publicApiCloudViolations).to.eq(res.policyViolationsCloud)
          })
      })
      .then((getMediumViolationsPublicApi) => {
        cy.request(publicGetViolationTypes({ project_id: store.project_id, has_iac: true, severity: "medium" }, store.apiAuthToken))
          .then((response) => { store.publicApiIacMediumViolations = response.body.length })
      })
      .then((validateWithTcsViolationsApi) => {
        cy.request(getFilteredViolations(store.project_id, '&hasViolation=true&severity=medium&hasIac=true'))
          .then((response) => {
            expect(store.publicApiIacMediumViolations).to.eq(response.body.types.length)
          })
      })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Create aws cloud account', () => {
      const awsCredentials = cloudCredentialsGenerator('aws')
      store.awsAccountID = awsCredentials["role_arn"].match(/:(\d+):/)[1]
      cy.request(publicCreateCloudAccount(
      [{
      "provider": "aws",
      "name": store.envName+"_aws_account",
      "email": store.envName+"@tenableQE.com",
      "management_group": store.envName+"_aws_mgmt_group",
      "credential": awsCredentials
      }],store.apiAuthToken))
      .then((response)=>{
          expect(response.status).to.eq(200)
      })
      .then((fetchCloudAccount) =>{
        let queryString = "page=1&page_size=5"
          cy.request(publicFetchCloudAccount({"providers":["aws"],"account":[store.awsAccountID]}, queryString, store.apiAuthToken))
          .then((response)=>{
            store.tcsIdForAwsCloudAccount = response.body.accounts[0].id
            expect(response.status).to.eq(200)
            expect(response.body.accounts[0].account_id = store.awsAccountID)
            expect(response.body.accounts[0].status).to.eq("Discovered")
          })
      })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Update aws cloud account', () => {
    store.awsCredentials = cloudCredentialsGenerator('aws')
    cy.request(publicUpdateCloudAccount(
      [{
      id: store.tcsIdForAwsCloudAccount,
      credential: store.awsCredentials
    }], store.apiAuthToken))
    .then((response)=>{
        expect(response.status).to.eq(200)
    })
  .then((crossValidateWithInternalEndpointResponse) => {
      cy.request(getMemberCloudAccounts())
      .then((response)=>{
          let awsAccount = response.body.find((account)=> account.provider === "aws" && account.managementGroup===`${store.envName}_aws_mgmt_group`)
          expect(awsAccount.credential["rolearn"]).to.eq(store.awsCredentials["role_arn"])
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Configure aws cloud account', () => {
    cy.request(publicCreateProject({
      cloud_provider: "aws",
      name: store.envName + '_aws_configure_account',
    }, store.apiAuthToken))
    .then(response => {
      expect(response.status).to.eq(200)
      expect(response.body.id).to.not.be.empty
      store.awsProjectID = response.body.id
    }) 
    .then((configureAccount) =>{
      cy.request(publicConfigureCloudAccount(
      [{
        "project_id": store.awsProjectID,
        "accounts":[{
            id: store.tcsIdForAwsCloudAccount,
            "credential": store.awsCredentials
        }]
      }], store.apiAuthToken))
      .then((response)=>{
          expect(response.status).to.eq(200)
      })
    })
    .then((crossValidateWithInternalEndpointResponse)=>{
        cy.request(getProjectCloudAccountAssociations(
          {"projectId":store.awsProjectID,"provider":"aws"}
        ))
        .then((response)=>{
          expect(response.body.associated[0].id).to.eq(store.tcsIdForAwsCloudAccount)
        })
      })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Create azure cloud account', () => {
      const azureCredentials = cloudCredentialsGenerator('azure')
      store.azureAccountID = azureCredentials["subscription_id"]
      cy.request(publicCreateCloudAccount(
      [{
        "provider": "azure",
        "name": store.envName+"_azure_account",
        "email": store.envName+"@tenableQE.com",
        "management_group": store.envName+"_azure_mgmt_group",
        "credential": azureCredentials
      }],store.apiAuthToken))
      .then((response)=>{
        expect(response.status).to.eq(200)
      })
      .then(fetchCloudAccounts =>{
        let queryString = "page=1&page_size=5"
        cy.request(publicFetchCloudAccount({"providers":["azure"],"account":[store.azureAccountID]}, queryString, store.apiAuthToken))
        .then((response)=>{
          store.tcsIdForAzureCloudAccount = response.body.accounts[0].id
          expect(response.status).to.eq(200)
          expect(response.body.accounts[0].account_id = store.azureAccountID)
          expect(response.body.accounts[0].status).to.eq("Discovered")
        })
      })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Update azure cloud account', () => {
    store.azureCredentials = cloudCredentialsGenerator('azure')
    cy.request(publicUpdateCloudAccount(
      [{
        id: store.tcsIdForAzureCloudAccount,
        credential: store.azureCredentials
      }], store.apiAuthToken))
    .then((response)=>{
        expect(response.status).to.eq(200)
    })
  .then((crossValidateWithInternalEndpointResponse) => {
    /**
    * @todo Validate if azureaccountid of cloud account is equal to updated project id (APE-15520)
    */
    cy.request(getMemberCloudAccounts())
    .then((response)=>{
        let azureAccount = response.body.find((account)=> account.provider === "azure" && account.managementGroup===`${store.envName}_azure_mgmt_group`)
        expect(azureAccount.id).to.eq(store.tcsIdForAzureCloudAccount)
    })
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Configure azure cloud account', () => {
    cy.request(publicCreateProject({cloud_provider: "azure",name: store.envName + '_azure_configure_account',}, store.apiAuthToken))
    .then(response => {
      store.azureProjectID = response.body.id
      expect(response.status).to.eq(200)
      expect(response.body.id).to.not.be.empty
    }) 
    .then((configureAccount) =>{
      cy.request(publicConfigureCloudAccount(
      [{
        "project_id": store.azureProjectID,
        "accounts": [{
          id: store.tcsIdForAzureCloudAccount, 
          credential: store.azureCredentials
        }]
      }], store.apiAuthToken))
      .then((response)=>{
          expect(response.status).to.eq(200)
      })
    })
    .then((crossValidateWithInternalEndpointResponse)=>{
      cy.request(getProjectCloudAccountAssociations({"projectId":store.azureProjectID,"provider":"azure"}))
      .then((response)=>{
        expect(response.body.associated[0].id).to.eq(store.tcsIdForAzureCloudAccount)
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Create gcp cloud account', () => {
    const gcpCredentials = cloudCredentialsGenerator('gcp')
    cy.request(publicCreateCloudAccount(
    [{
      "provider": "gcp",
      "name": store.envName+"_gcp_account",
      "email": store.envName+"@tenableQE.com",
      "management_group": store.envName+"_gcp_mgmt_group",
      "credential": gcpCredentials
    }],store.apiAuthToken))
    .then((response)=>{
        expect(response.status).to.eq(200)
    })
    .then((fetchCloudAccount) =>{
      let queryString = "page=1&page_size=5"
      cy.request(publicFetchCloudAccount({"providers":["gcp"],names:[store.envName+"_gcp_account"]}, queryString, store.apiAuthToken))
      .then((response)=>{
        store.tcsIdForGcpCloudAccount = response.body.accounts[0].id
        expect(response.status).to.eq(200)
        expect(response.body.accounts[0].name = store.envName+"_gcp_account")
        expect(response.body.accounts[0].status).to.eq("Discovered")
        // expect(response.body.accounts[0].account_id).not.eq("") // This will fail due to APE-15627 
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Update gcp cloud account', () => {
    store.gcpCredentials = cloudCredentialsGenerator('gcp')
    cy.request(publicUpdateCloudAccount(
      [{
        id: store.tcsIdForGcpCloudAccount,
        credential: store.gcpCredentials
      }], store.apiAuthToken))
    .then((response)=>{ 
        expect(response.status).to.eq(200)
    })
  .then((crossValidateWithInternalEndpointResponse) => {
      /**
      * @todo Validate if gcpaccountid of cloud account is equal to updated project id (APE-15520)
      */ 
      cy.request(getMemberCloudAccounts())
      .then((response)=>{
          let gcpAccount = response.body.find((account)=> account.provider === "gcp" && account.managementGroup===`${store.envName}_gcp_mgmt_group`)
          expect(gcpAccount.id).to.eq(store.tcsIdForGcpCloudAccount)
      })
    })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Configure gcp cloud account', () => {
    cy.request(publicCreateProject({cloud_provider: "gcp",name: store.envName + '_gcp_configure_account'}, store.apiAuthToken))
    .then(response => {
      store.gcpProjectID = response.body.id
      expect(response.status).to.eq(200)
      expect(response.body.id).to.not.be.empty
    }) 
    .then((configureAccount) =>{
      cy.request(publicConfigureCloudAccount(
      [{
      "project_id": store.gcpProjectID,
      "accounts": [{
        id: store.tcsIdForGcpCloudAccount,
        credential: store.gcpCredentials
      }]
      }], store.apiAuthToken))
      .then((response)=>{
        expect(response.status).to.eq(200)
      })
    })
    .then((crossValidateWithInternalEndpointResponse)=>{
        cy.request(getProjectCloudAccountAssociations(
          {"projectId":store.gcpProjectID,"provider":"gcp"}
        ))
        .then((response)=>{
          expect(response.body.associated[0].id).to.eq(store.tcsIdForGcpCloudAccount)
        })
      })
  })

  /**--------------------------------------------------------
   * Added by: tlikhar
   * Test Management ID:
  ---------------------------------------------------------*/
  it('MUST - Fetch cloud account', ()=>{
    let queryString = "page=1&page_size=5"
    cy.request(publicFetchCloudAccount({
      "providers":["aws","gcp","azure"],
      emails:[store.envName+"@tenableQE.com"],
      projects:[`${store.awsProjectID}`,`${store.azureProjectID}`,`${store.gcpProjectID}`],
      names:[`${store.envName}_aws_account`,`${store.envName}_azure_account`,`${store.envName}_gcp_account`],
      managementGroups:[`${store.envName}_aws_mgmt_group`,`${store.envName}_azure_mgmt_group`,`${store.envName}_gcp_mgmt_group`]
    }, queryString, store.apiAuthToken))
    .then((response)=>{
      expect(response.status).to.eq(200)
      expect(response.body.total).not.eq(0)
    })
  })







})







