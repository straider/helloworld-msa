# api-gateway
API Gateway using Feign and Hystrix.

The API-Gateway is a microservices architectural pattern. For more information about this pattern, visit: <http://microservices.io/patterns/apigateway.html>

The detailed instructions to run *Red Hat Helloworld MSA* demo, can be found at the following repository: <https://github.com/redhat-helloworld-msa/helloworld-msa>


Build and Deploy api-gateway locally
------------------------------------

1. Open a command prompt and navigate to the root directory of this api-gateway.
2. Type this command to build and execute the api-gateway:

        mvn clean compile spring-boot:run

3. The application will be running at the following URL: <http://localhost:8080/api>
        
Deploy the application in Openshift
-----------------------------------

1. Make sure to be connected to the Docker Daemon
2. Execute

		mvn clean package docker:build fabric8:json fabric8:apply
