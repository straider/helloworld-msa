export JAVA_HOME=/c/DevKits/Java/openjdk-8u111-1/

----

oc login https://10.1.2.2:8443 --username=admin --password=admin

oc project openshift-infra

# Hawkular
# https://github.com/openshift/origin-metrics
oc create -f https://raw.githubusercontent.com/hawkular/hawkular-openshift-agent/master/deploy/openshift/hawkular-openshift-agent-configmap.yaml
oc process -f https://raw.githubusercontent.com/hawkular/hawkular-openshift-agent/master/deploy/openshift/hawkular-openshift-agent.yaml IMAGE_VERSION=1.4.1.Final | oc create -f -
oc adm policy add-cluster-role-to-user hawkular-openshift-agent system:serviceaccount:default:hawkular-openshift-agent

# Grafana
oc process -f https://raw.githubusercontent.com/hawkular/hawkular-grafana-datasource/master/docker/openshift/openshift-template-persistent.yml | oc create -f -
oc deploy hawkular-grafana

# Jaeger
oc process -f https://raw.githubusercontent.com/jaegertracing/jaeger-openshift/0.1.1/all-in-one/jaeger-all-in-one-template.yml | oc create -f -
# oc env dc -l app JAEGER_SERVER_HOSTNAME=jaeger-all-in-one

# Kubeflix
oc process -f http://central.maven.org/maven2/io/fabric8/kubeflix/packages/kubeflix/1.0.17/kubeflix-1.0.17-kubernetes.yml | oc create -f -
oc expose service hystrix-dashboard --port=8080

----

# Keycloak SSO
# oc new-project helloworld-sso --display-name="HelloWorld Single Sign-On" --description="Red Hat Keycloak solution for an open source Identity and Access Management solution."
# git clone https://github.com/redhat-helloworld-msa/sso
pushd sso/
oc new-build --binary --name keycloak
oc start-build keycloak --from-dir=. --follow
oc new-app keycloak
oc expose svc/keycloak
oc set probe dc/keycloak --readiness --get-url=http://:8080/auth
# oc policy add-role-to-user admin system:serviceaccount:helloworld-sso:turbine
oc policy add-role-to-user admin system:serviceaccount:openshift-infra:turbine
popd

----

oc login https://10.1.2.2:8443 --username=openshift-dev --password=devel

# HelloWorld MSA
oc new-project jc-helloworld-msa --display-name="HelloWorld Microservices Architecture" --description="Playground with distinct “HelloWorld” microservices, built using different technologies, to allow developers to learn and explore."

# bonjour (NodeJS) microservice
# git clone https://github.com/redhat-helloworld-msa/bonjour
pushd bonjour/
oc new-build --binary --name=bonjour -l app=bonjour
npm install
oc start-build bonjour --from-dir=. --follow
oc new-app bonjour -l app=bonjour
oc expose service bonjour
oc set probe dc/bonjour --readiness --get-url=http://:8080/api/health
oc env dc/bonjour KEYCLOAK_AUTH_SERVER_URL=http://keycloak-openshift-infra.rhel-cdk.10.1.2.2.xip.io/auth
popd

# hola (JAX-RS/Wildfly Swarm) microservice
# git clone https://github.com/redhat-helloworld-msa/hola
pushd hola/
oc new-build --binary --name=hola -l app=hola
mvn package
oc start-build hola --from-dir=. --follow
oc new-app hola -l app=hola,hystrix.enabled=true
oc expose service hola
oc set probe dc/hola --readiness --get-url=http://:8080/api/health
oc env dc/hola KEYCLOAK_AUTH_SERVER_URL=http://keycloak-openshift-infra.rhel-cdk.10.1.2.2.xip.io/auth
popd

# aloha (Vert.x) microservice
# git clone https://github.com/redhat-helloworld-msa/aloha
pushd aloha/
oc new-build --binary --name=aloha -l app=aloha
mvn package
oc start-build aloha --from-dir=. --follow
oc new-app aloha -l app=aloha,hystrix.enabled=true
oc expose service aloha
oc env dc/aloha AB_ENABLED=jolokia
oc patch dc/aloha -p '{"spec":{"template":{"spec":{"containers":[{"name":"aloha","ports":[{"containerPort": 8778,"name":"jolokia"}]}]}}}}'
oc set probe dc/aloha --readiness --get-url=http://:8080/api/health
oc env dc/aloha KEYCLOAK_AUTH_SERVER_URL=http://keycloak-openshift-infra.rhel-cdk.10.1.2.2.xip.io/auth
popd

# ola (Spring Boot) microservice
# git clone https://github.com/redhat-helloworld-msa/ola
pushd ola/
oc new-build --binary --name=ola -l app=ola
mvn package
oc start-build ola --from-dir=. --follow
oc new-app ola -l app=ola,hystrix.enabled=true
oc expose service ola
oc env dc/ola AB_ENABLED=jolokia
oc patch dc/ola -p '{"spec":{"template":{"spec":{"containers":[{"name":"ola","ports":[{"containerPort": 8778,"name":"jolokia"}]}]}}}}'
oc set probe dc/ola --readiness --get-url=http://:8080/api/health
oc env dc/ola KEYCLOAK_AUTH_SERVER_URL=http://keycloak-openshift-infra.rhel-cdk.10.1.2.2.xip.io/auth
popd

# namaste (Dropwizard) microservice
# git clone https://github.com/redhat-helloworld-msa/namaste
pushd namaste/
oc new-build --binary --name=namaste -l app=namaste
mvn package
oc start-build namaste --from-dir=. --follow
oc new-app namaste -l app=ola,hystrix.enabled=true
oc expose service namaste
oc env dc/namaste AB_ENABLED=jolokia
oc patch dc/namaste -p '{"spec":{"template":{"spec":{"containers":[{"name":"namaste","ports":[{"containerPort": 8778,"name":"jolokia"}]}]}}}}'
oc set probe dc/namaste --readiness --get-url=http://:8080/api/health
oc env dc/namaste KEYCLOAK_AUTH_SERVER_URL=http://keycloak-openshift-infra.rhel-cdk.10.1.2.2.xip.io/auth
popd

# api-gateway (Spring Boot)
# git clone https://github.com/redhat-helloworld-msa/api-gateway
pushd api-gateway/
oc new-build --binary --name=api-gateway -l app=api-gateway
mvn package
oc start-build api-gateway --from-dir=. --follow
oc new-app api-gateway -l app=api-gateway,hystrix.enabled=true
oc expose service api-gateway
oc env dc/api-gateway AB_ENABLED=jolokia; oc patch dc/api-gateway -p '{"spec":{"template":{"spec":{"containers":[{"name":"api-gateway","ports":[{"containerPort": 8778,"name":"jolokia"}]}]}}}}'
oc set probe dc/api-gateway --readiness --get-url=http://:8080/health
popd

# frontend (NodeJS/HTML5/JS)
# git clone https://github.com/redhat-helloworld-msa/frontend
pushd frontend/
oc new-build --binary --name=frontend -l app=frontend
npm install
oc start-build frontend --from-dir=. --follow
oc new-app frontend -l app=frontend
oc expose service frontend
oc set probe dc/frontend --readiness --get-url=http://:8080/
oc env dc/frontend KEYCLOAK_AUTH_SERVER_URL=http://keycloak-openshift-infra.rhel-cdk.10.1.2.2.xip.io/auth ENABLE_SSO=true
oc env dc/frontend ENABLE_JAEGER=true
oc env dc/frontend ENABLE_HYSTRIX=true
popd

oc env dc -l app JAEGER_SERVER_HOSTNAME=jaeger-all-in-one

# Configuring Application
# With Environment Variables
# Using ConfigMaps

# Jenkins

# Deployment Patterns

# Blue/Green deployment using Routes
# Blue/Green deployment using Services
# Canary deployments
