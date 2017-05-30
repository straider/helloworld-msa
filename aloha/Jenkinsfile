node () {

    @Library('github.com/redhat-helloworld-msa/jenkins-library@master')
    
    def mvnHome = tool 'M3'
    def javaHome = tool 'jdk8'

    stage ('Git checkout'){
        echo 'Checking out git repository'
        checkout scm
    }

    stage ('Build project with Maven'){
        echo 'Building project'
        sh "${mvnHome}/bin/mvn package"
    }

    stage ('Build image and deploy in Dev'){
        echo 'Building docker image and deploying to Dev'
        buildApp('helloworld-msa-dev', "aloha")
        echo "This is the build number: ${env.BUILD_NUMBER}"
    }

    stage ('Automated tests'){
        echo 'This stage simulates automated tests'
        sh "${mvnHome}/bin/mvn -B -Dmaven.test.failure.ignore verify"
    }

    stage ('Deploy to QA'){
        echo 'Deploying to QA'
        promoteImage('helloworld-msa-dev', 'helloworld-msa-qa', 'aloha', 'latest')
    }

    stage ('Wait for approval'){
        input 'Approve to production?'
    }

    stage ('Deploy to production'){
        echo 'Deploying to production'
        promoteImage('helloworld-msa-dev', 'helloworld-msa', 'aloha', env.BUILD_NUMBER)
        canaryDeploy('helloworld-msa', 'aloha', env.BUILD_NUMBER)
    }
}
