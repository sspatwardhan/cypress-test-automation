import {
    getJiraPriorities, createJiraTicket, connectJira, getJiraProjects, getJiraIssuesByProject, getJiraIssueTypes, getJiraIssueFields,
    disconnectJira, getJiraUsers, configureJiraIntegration, getJiraIntegration, deleteJiraIntegration, searchJiraUsers
} from '../../../requests/jira';
import { createProjectWithDefaultPolicies } from '../../../requests/projects';
import { initAPISpecRoutine, getSpecBasedNamePrefix } from '../../../support/utils'

const store = {
    envName: `${getSpecBasedNamePrefix() + Date.now()}`,
    jiraSite: 'tenb-qa.atlassian.net',
    jiraEmail: 'jira-user1@xyz.com',
    jiraIssueAssigneeEmail: 'jira-user1@xyz.com',
    jiraActiveApiToken:'XXXXXXX',
    jiraProjectNameToLookFor: 'org-use-me',
    jiraIssueTypeNameToLookFor: "Security Issue",
    JiraRevokedApiToken: "XXXXXXX",
    jiraUsersToBeSearched: ["spat", "Anjana", "xyz", ""]
}

describe('Verify integrations', () => {
    before(() => initAPISpecRoutine('before'))
    after(()=> initAPISpecRoutine('after'))

    //--------------------- Tests start here ------------------------

    /**--------------------------------------------------------
     * Added by: tlikhar
     * Test Management ID:
    ---------------------------------------------------------*/
    it('MUST - Get JIRA Integration', () => {
        cy.request(getJiraIntegration()).then((response) => {
            expect(response.status).to.be.eq(200)
            expect(response.body.length).to.be.above(0)
            store.jira_setting_id = response.body[0].id
        })
    })

     /**--------------------------------------------------------
       * Added by: tlikhar
       * Test Management ID:
      ---------------------------------------------------------*/
      it('MUST - Disconnect from JIRA ', () => {
        cy.request(deleteJiraIntegration(store.jira_setting_id)).then((response) => {
            expect(response.status).to.be.eq(200)
        })
        .then(deleteJiraToken => {
            cy.request(disconnectJira()).then((response) => {
                expect(response.status).to.be.oneOf([200, 204])
            })
        })
    })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('DEMO - MUST - Validate step: Enter your credentials - validate negative scenarios', () => {
        cy.request(connectJira('invalidSite.atlassian.com', store.jiraEmail, store.jiraActiveApiToken))
        .then((response) => {
            expect(response.status).to.eq(400)
            expect(response.body.message).to.eq('domain must end with atlassian.net')
        })
        cy.request(connectJira(store.jiraSite, 'invalid@email.com', store.jiraActiveApiToken))
        .then((response) => {
            expect(response.status).to.eq(400)
            expect(response.body.message).to.eq('invalid details provided')
        })
        cy.request(connectJira(store.jiraSite, store.jiraEmail, store.JiraRevokedApiToken))
        .then((response) => {
            expect(response.status).to.eq(400)
            expect(response.body.message).to.eq('invalid details provided')
        })
    })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('DEMO - MUST - Validate step: Enter your credentials', () => {
        cy.request(connectJira(store.jiraSite, store.jiraEmail, store.jiraActiveApiToken))
        .then((response) => {
            expect(response.status).to.be.oneOf([200, 204])
        })
    })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('DEMO - MUST - Validate step: Setup Jira Configuration', () => {
        cy.request(connectJira(store.jiraSite, store.jiraEmail, store.jiraActiveApiToken))
        .then((response) => {
            expect(response.status).to.be.oneOf([200, 204])
        })
    })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('DEMO - MUST - Validate and store project related data', () => {
        cy.request(getJiraProjects())
        .then(response => {
            expect(response.status).to.eq(200)
            store.jiraProjectID = response.body.find(projectDetails => projectDetails.name.includes(store.jiraProjectNameToLookFor)).id;
            store.jiraProjectKey = response.body.find(projectDetails => projectDetails.name.includes(store.jiraProjectNameToLookFor)).key;
            store.jiraProjectName = response.body.find(projectDetails => projectDetails.name.includes(store.jiraProjectNameToLookFor)).name;
        })
    })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('DEMO - MUST - Validate and store jira issue type id', () => {
        cy.request(getJiraIssueTypes(store.jiraProjectID))
        .then(response => {
            expect(response.status).to.eq(200)
            store.jiraIssueID = response.body.find(issueTypes => issueTypes.name === store.jiraIssueTypeNameToLookFor).id;
        })
    })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('DEMO - MUST - Validate jira issue fields', () => {
        cy.request(getJiraIssueFields(store.jiraProjectID,store.jiraIssueID))
        .then(response => {
            expect(response.status).to.eq(200)
        })
    })
    
    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('DEMO - MUST - Validate and store jira users', () => {
        cy.request(getJiraUsers(store.jiraProjectKey))
        .then(response => {
            expect(response.status).to.eq(200)
            store.jiraAccountIdForReporter = response.body.find(jiraUsers => jiraUsers.emailAddress === store.jiraEmail).accountId;
            store.jiraDisplayNameForReporter = response.body.find(jiraUsers => jiraUsers.emailAddress === store.jiraEmail).displayName;
            store.jiraAccountIdForAssignee = response.body.find(jiraUsers => jiraUsers.emailAddress === store.jiraIssueAssigneeEmail).accountId;
            store.jiraDisplayNameForAssignee = response.body.find(jiraUsers => jiraUsers.emailAddress === store.jiraIssueAssigneeEmail).displayName;
        })
    })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('DEMO - MUST - Validate search jira users', () => {
        store.jiraUsersToBeSearched.forEach(searchKey => {
            cy.request(searchJiraUsers(store.jiraProjectKey,searchKey))
            .then(response => {
                expect(response.status).to.eq(200)
                expect(response.body.length).not.eq(null)
            })
        });
    })
    
    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('DEMO - MUST - Validate and store jira priorities', () => {
        cy.request(getJiraPriorities())
        .then(response => {
            expect(response.status).to.eq(200)
            store.jiraPriorityID = response.body.find(priorities => priorities.name === 'Medium').id;
        })
    })
      
    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('DEMO - MUST - Validate commit jira integration with all details', () => {
        cy.request(configureJiraIntegration({
            "settings": {
                "project": { "id": store.jiraProjectID, "name": store.jiraProjectName, "key": store.jiraProjectKey },
                "issueType": { "id": store.jiraIssueID, "name": store.jiraIssueTypeNameToLookFor }, "title": store.envName, "description": store.envName,
                "assignee": { "accountId": store.jiraAccountIdForAssignee, "displayName": store.jiraDisplayNameForAssignee },
                "reporter": {
                    "accountId": store.jiraAccountIdForReporter,
                    "displayName": store.jiraDisplayNameForReporter
                }
            }
        })).then((response) => {
            expect(response.status).to.be.oneOf([200, 500])
        })
    })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('MUST - Create AWS - cloud only environment for testing ', () => {
        //Create Environment
        createProjectWithDefaultPolicies(store.envName, "aws")
        cy.get("@createProjectWithDefaultPolicy_ID").then((response) => {
            store.envID = response
        })
    })

    /**--------------------------------------------------------
     * Added by: Spat
     * Test Management ID:
    ---------------------------------------------------------*/
    it('MUST - Create Jira issue', () => {
        cy.request(createJiraTicket(
        {
            envId: store.envID, issue: store.jiraIssueTypeNameToLookFor,
            jira:
            { fields: {
                "project": { "id": store.jiraProjectID },
                "issuetype": { "id": store.jiraIssueID },
                "reporter": { "accountId": store.jiraAccountIdForReporter },
                "assignee": { "accountId": store.jiraAccountIdForAssignee },
                "priority": { "id": store.jiraPriorityID },
                "summary": store.envName+": A resource misconfiguration has occurred for the following resource: azurerm_resource_group.example",
                "description": store.envName+": Failing Misconfigurations: \n\nMisconfiguration:Ensure that Activity Log Alert exists for Delete Public IP Address rule\nRemediation Steps: \n**From Azure Portal**\n\n1. Navigate to the Monitor blade.\n1. Select 'Alerts'.\n1. Select 'Create'.\n1. Select 'Alert rule'.\n1. Under 'Filter by subscription', choose a subscription.\n1. Under 'Filter by resource type', select 'Public IP addresses'.\n1. Under 'Filter by location', select 'All'.\n1. From the results, select the subscription.\n1. Select 'Done'.\n1. Select the 'Condition' tab.\n1. Under 'Signal name', click 'Delete Public Ip Address (Microsoft.Network/publicIPAddresses)'.\n1. Select the 'Actions' tab.\n1. To use an existing action group, click 'Select action groups'. To create a new action group, click 'Create action group'. Fill out the appropriate details for the selection.\n1. Select the 'Details' tab.\n1. Select a 'Resource group', provide an 'Alert rule name' and an optional 'Alert rule description'.\n1. Click 'Review + create'.\n1. Click 'Create'.\n\n**From Azure CLI**\n\n\naz monitor activity-log alert create --resource-group \"<resource group name>\" --condition category=Administrative and operationName=Microsoft.Network/publicIPAddresses/delete and level=<verbose | information | warning | error | critical>--scope \"/subscriptions/<subscription ID>\" --name \"<activity log rule name>\" --subscription <subscription id> --action-group <action group ID> --location global\n\n\n**From PowerShell**\n\nCreate the 'Conditions' object.\n\n\n$conditions = @()\n$conditions += New-AzActivityLogAlertAlertRuleAnyOfOrLeafConditionObject -Equal Administrative -Field category\n$conditions += New-AzActivityLogAlertAlertRuleAnyOfOrLeafConditionObject -Equal Microsoft.Network/publicIPAddresses/delete -Field operationName\n$conditions += New-AzActivityLogAlertAlertRuleAnyOfOrLeafConditionObject -Equal Verbose -Field level\n\n\nRetrieve the 'Action Group' information and store in a variable, then create the 'Actions' object.\n\n\n$actionGroup = Get-AzActionGroup -ResourceGroupName <resource group name> -Name <action group name>\n$actionObject = New-AzActivityLogAlertActionGroupObject -Id $actionGroup.Id\n\n\nCreate the 'Scope' object\n\n\n$scope = \"/subscriptions/<subscription ID>\"\n\n\nCreate the 'Activity Log Alert Rule' for 'Microsoft.Network/publicIPAddresses/delete'\n\n\nNew-AzActivityLogAlert -Name \"<activity log alert rule name>\" -ResourceGroupName \"<resource group name>\" -Condition $conditions -Scope $scope -Location global -Action $actionObject -Subscription <subscription ID> -Enabled $true\n\n\nAffected Resource: example\nCloud ID: undefined\nIAC ID: azurerm_resource_group.example\nCloud Account: -\nCloud Provider: Azure\nResource Link: https://qa-milestone.cloud.aws.orgNamesecurity.com/apiHandle/globalResources?selectedResourceType=azurerm_resource_group&resourceId=azurerm_resource_group.example\n"
            }},
            "priority": store.jiraPriorityID,
            "violationDetails": {
                "violationSlug": "DUMMY-VIOLATION-SLUG-bcfc-ca9d4b07078d",
                "resourceId": "",
                "resourceViolationId": "",
                "violationId": ""
            }
        }))
        .then(response => {
            expect(response.status).to.eq(200)
            expect(response.body.id).to.not.be.empty
            expect(response.body.key).to.not.be.empty
        })
        //Verify Jira Issue
        cy.request(getJiraIssuesByProject(store.envID)).then(jiraResp => {
            expect(jiraResp.body.jiraEntries.find(entry => entry.environmentId === store.envID).summary).to.include(getSpecBasedNamePrefix())
        })
    }) 
})