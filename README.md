# <a href='https://cloudbees.eng.tenable.com/teams-accurics/job/accurics/view/QE/job/Tenable-CS-API-BUILD-ACCEPTANCE-TESTS/'><img src='https://cloudbees.eng.tenable.com/teams-accurics/job/accurics/view/QE/job/Tenable-CS-API-BUILD-ACCEPTANCE-TESTS/badge/icon'></a>

## Libraries and plugins used

- [Cypress](https://www.cypress.io/)

## Dependencies

To run the tests, please ensure you have the following installed to the latest:

- Node
- NPM

## How to run

```sh
## Install dependencies
npm install

## Run Must Pass tests in all specs
npx cypress run --env grep=MUST,qaUserName=<tio_userName>,qaUserPassword=<tio_userPassword>,configFile=qa-milestone

## Run Must Pass tests in one or more specs
npx cypress run --env grep=MUST,qaUserName=<tio_userName>,qaUserPassword=<tio_userPassword>,configFile=qa-milestone --spec=cypress/tests/api/core_operations/aws-terraform.spec.js,cypress/tests/api/core_operations/az-terraform.spec.js
```

## Pre-requisites for target T.cs Account (cypress.env.json)
- pre-configured tenant => gitHub/bitbucket/gitlab/ADO/BOT/AWS-CodeCommit integrations pre-configured where the target repositories in the specs are present (Please contact Saurabh (@spatwardhan), Tushar (@tlikhar) for more details)
- Following cloud accounts already configured
    - AWS Account: XXXX, YYYYY
    - Azure Subscriptions: XXXXXX
    - GCP Project: XXXXXXX