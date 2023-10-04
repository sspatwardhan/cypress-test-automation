pipeline {
    agent { docker { image 'cypress/base:16.13.0' } }
    stages {
        stage('Setup..') {
            steps { 
                sh 'rm -rf /home/node/.cache && rm -rf node_modules && npm install --save-dev'
            }
        }
        stage('demo-tests-in-applicable-specs') {
            steps {
                // Setting build name
                buildName "DEMO tests -> ${testSite}: ${username}"
                sh 'cypress cache clear && rm -rf node_modules && npm install --save-dev'
                sh 'npx browserslist@latest --update-db'
                sh 'sleep 5'
                sh "NO_COLOR=1 npx cypress run --env grep=DEMO,qaUserName=${userName},qaUserPassword=${password},configFile=${testSite}"
            }
        }
    }
    post {
        always {
            junit 'cypress/report/*.xml'
        }
    }
}