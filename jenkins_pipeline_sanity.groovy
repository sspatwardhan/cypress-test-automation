@Library('tenable.common') _

import com.tenable.jenkins.*
import com.tenable.jenkins.builds.*
import com.tenable.jenkins.common.*
import com.tenable.jenkins.Constants
import com.tenable.jenkins.slack2.*

def sendSlackNotification(status, site=null, runType=null) {
    Slack slack = new Slack(this)
    def channel = '#tenable-cs-bat-api'
    Map messageAttachment = [:]
    Common common = new Common(this)
    String results = common.getTestResults('')

    if (status == 'START') {
        def preText = "[#${BUILD_NUMBER}] [${site}] [Build Started] T.CS BAT - API [${runType}]"
        messageAttachment = slack.helper.getDecoratedStartMsg(preText)
    } else if (status == 'END') {
        def preText = "[#${BUILD_NUMBER}] [Build Completed] T.CS BAT - API [${runType}]"
        def text = "\n ${results}"
        messageAttachment = slack.helper.getDecoratedMsg(preText, text)
    } else if (status == 'SUCCESS') {
        def preText = "[#${BUILD_NUMBER}] [${site}] T.CS BAT - API [${runType}] - "
        def text = "\n ${results}"
        messageAttachment = slack.helper.getDecoratedFinishMsg(preText, text)
    } else if (status == 'FAILURE') {
        def preText = "[#${BUILD_NUMBER}] [${site}] T.CS BAT - API [${runType}] - FAILURE"
        def text = "\n ${results}"
        text += "\n${BUILD_URL}"
        text += "\n@rbade   - Week 1"
        text += "\n@asingh  - Week 2"
        text += "\n@rdesai  - Week 3"
        text += "\n@tlikhar - Week 4"
        text += "\nAnalyse/report the failures ASAP"
        messageAttachment = slack.helper.getDecoratedFailMsg(preText, text)
    } else {
        println('Invalid status, cannot send slack notification!')
    }

    messageAttachment.channel = channel
    slack.postMessage(messageAttachment)
}

pipeline {
    agent { docker { image 'cypress/base:16.13.0' } }
    stages {
        stage('Setup') {
            steps {
                sh 'rm -rf /home/node/.cache && rm -rf node_modules && npm install --save-dev'
                sh 'npx browserslist@latest --update-db'
            }
        }
        stage('Core Functionality') {
            when { expression { runWhat == 'must-pass-tests-in-all-specs' } }
            parallel {
                stage('Batch 1') {
                    steps {
                        buildName setBuildName == '' ? "MUST-ALL tests -> ${testSite}: ${username}" : setBuildName
                        sh 'sleep 5'
                        catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE'){
                            sh "NO_COLOR=1 npx cypress run --env grep=MUST,qaUserName=${userName},qaUserPassword=${password},configFile=${testSite} --spec=cypress/tests/api/core_operations/aws-terraform.spec.js,cypress/tests/api/core_operations/az-terraform.spec.js,cypress/tests/api/core_operations/crud-operations/cloud-scan-profile.spec.js,cypress/tests/api/compliance/compliance.spec.js,cypress/tests/api/core_operations/crud-operations/webhook.spec.js"
                        }
                    }
                }
                stage('Batch 2') {
                    steps {
                        sh 'sleep 5'
                        catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE'){
                            sh "NO_COLOR=1 npx cypress run --env grep=MUST,qaUserName=${userName},qaUserPassword=${password},configFile=${testSite} --spec=cypress/tests/api/zen/validate-tfstate-mapping.spec.js,cypress/tests/api/integrations/integrations.spec.js,cypress/tests/api/integrations/jira.spec.js,cypress/tests/api/policies/custom-policy.spec.js,cypress/tests/api/policies/custom-policy-group.spec.js,cypress/tests/api/policies/ignore-unignore-resource-misconfigs.spec.js"
                        }
                    }
                }
                stage('Batch 3') {
                    steps {
                        sh 'sleep 5'
                        catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE'){
                          sh "NO_COLOR=1 npx cypress run --env grep=MUST,qaUserName=${userName},qaUserPassword=${password},configFile=${testSite} --spec=cypress/tests/api/core_operations/tfstate/tfstate.spec.js,cypress/tests/api/core_operations/gcp-terraform.spec.js,cypress/tests/api/core_operations/aws-non-tf-engines.spec.js,cypress/tests/api/core_operations/public-apis.spec.js,cypress/tests/api/defects/defects-batch1.spec.js,cypress/tests/api/core_operations/crud-operations/cloud-insights.spec.js"
                        }
                    }
                }
            }
        }
        stage('Supporting Functionality') {
            when { expression { runWhat == 'must-pass-tests-in-all-specs' } }
            steps {
                sh 'sleep 5'
                catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE'){
                    sh "NO_COLOR=1 npx cypress run --env grep=MUST,qaUserName=${userName},qaUserPassword=${password},configFile=${testSite} --spec=cypress/tests/api/common_operations/postRunValidations.spec.js,cypress/tests/api/core_operations/cloudAccountDiscovery.spec.js,cypress/tests/api/common_operations/exportReports.spec.js"
                }
            }
        }
        stage('On-premise Scanner tests') {
            when { expression { runWhat == 'on-premise-scanner-specs' } }
            steps {
                buildName "On-premise Scanner spec -> ${testSite}: ${username}"
                sh 'npx cypress cache clear && rm -rf node_modules && npm install --save-dev'
                sh 'sleep 5'
                sh "NO_COLOR=1 npx cypress run --env grep=ONPREM-SCANNER,qaUserName=${userName},qaUserPassword=${password},configFile=${testSite} --spec=cypress/tests/api/core_operations/onpremise-code-scanner.spec.js"
            }
        }
        stage('Must pass tests in selected') {
            when { expression { runWhat == 'must-pass-tests-in-selected-specs' } }
            steps {
                buildName setBuildName == '' ? "MUST-SELECTIVE tests -> ${testSite}: ${username}" : setBuildName
                sh 'NO_COLOR=1 npx cypress cache clear && rm -rf node_modules && npm install --save-dev'
                sh 'sleep 5'
                sh "NO_COLOR=1 npx cypress run --env grep=MUST,qaUserName=${userName},qaUserPassword=${password},configFile=${testSite} --spec=${commaSeparatedSpecPaths}"
            }
        }
    }
    post {
        always {
            junit 'cypress/report/*.xml'
            script {
                if (currentBuild.result == null || currentBuild.result == 'SUCCESS') {
                    currentBuild.result = 'SUCCESS'
                } else {
                    currentBuild.result = 'FAILURE'
                }
            }
        }
        success {
            script {
                if (notifyOnSlack == 'Yes'){
                    sendSlackNotification('SUCCESS', testSite, runWhat)
                }
            }
        }
        failure {
            script {
                if (notifyOnSlack == 'Yes'){
                    sendSlackNotification('FAILURE', testSite, runWhat)
                }
            }
        }
    }
}