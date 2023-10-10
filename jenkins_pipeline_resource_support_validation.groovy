pipeline {
    agent { docker { image 'cypress/base:16.13.0' } }
    stages {
        stage("Get resource_support.json..") {
            steps {
                // Copy the latest resource_support data from the lib-apiHandle-csp
                copyArtifacts(projectName: 'lib-apiHandle-csp/master', filter: 'resource/bucket_creation_data.json', target: 'cypress/fixtures', flatten: true)
                // Rename and copy resource support to cypress/fixtures
                sh 'mv cypress/fixtures/bucket_creation_data.json cypress/fixtures/resource_support.json'
                sh 'ls cypress/fixtures'
            }
        }
        stage('Automation setup..') {
            steps { 
                sh 'rm -rf /home/node/.cache && rm -rf node_modules && npm install --save-dev'
                sh 'npx browserslist@latest --update-db'
            }
        }
        stage('Resource support validation') {
            steps {
                buildName setBuildName == '' ? "Resource Support Validation -> ${testSite}: ${username}" : setBuildName
                sh 'NO_COLOR=1 npx cypress cache clear && rm -rf node_modules && npm install --save-dev'
                sh 'sleep 5'
                sh "NO_COLOR=1 npx cypress run --env qaUserName=${userName},qaUserPassword=${password},configFile=${testSite} --spec=${commaSeparatedSpecPaths}"
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'cypress/downloads/*resource_types*.csv', allowEmptyArchive: true
        }
    }
}