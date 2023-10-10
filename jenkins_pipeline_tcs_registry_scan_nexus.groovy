@Library('orgName.common') _

import com.orgName.jenkins.*
import com.orgName.jenkins.builds.*
import com.orgName.jenkins.common.*
import com.orgName.jenkins.Constants


pipeline {
    agent any
    stages {
        stage("Install TCS CLI...") {
            steps {
                sh "wget ${cli_download_url}"
                script{
                def fileName = sh(returnStdout:true, script: 'echo "${cli_download_url}" | cut -f10 -d "/"')
                sh "tar -xvf $fileName "
                sh "chmod +x tcs"
                sh "./tcs version"
                }
            }
        }
        stage("Scannning Registry...") {
            steps {
                //Run registry scan
                sh "./tcs  consec registry https://${registry_url} --username=${registryUserName} --password=${registryPassword} --appurl ${env_url} --token ${api_token}   --project ${project_id} -l debug  > registry_scan_output"
                
                sh 'cat registry_scan_output'

                script{
                def new_image_count = sh(returnStdout:true, script: 'cat registry_scan_output | grep "New images found" | cut -f2 -d ":"')
                def total_image_count = sh(returnStdout:true, script: 'cat registry_scan_output | grep "Total images found" | cut -f2 -d ":"')
                def scan_success_message = sh(returnStdout:true, script: 'cat registry_scan_output | grep "scan completed successfully"')
                
                int new_image = Integer.valueOf(new_image_count.trim()).intValue()
                int total_image = Integer.valueOf(total_image_count.trim()).intValue()

                //Verification of cli stdout
                if(scan_success_message.contains("scan completed successfully") &&  new_image >= 0 && total_image > 0){
                    sh "echo New images : ${new_image_count}"
                    sh "echo Total images : ${total_image_count}"
                    sh "echo ${scan_success_message}"

                }
                else{
                    // display values from registry summary
                    sh "echo New images : ${new_image_count}"
                    sh "echo Total images : ${total_image_count}"
                    sh "echo ${scan_success_message}"
                    
                    //display errors from console log if there are any and exit
                    sh "cat registry_scan_output | grep error"
                    sh 'exit 1'
                }
                }
            
            }
        }
        
    }
}