/**
 * JBoss, Home of Professional Open Source
 * Copyright 2017, Red Hat, Inc. and/or its affiliates, and individual
 * contributors by the @authors tag. See the copyright.txt in the
 * distribution for a full listing of individual contributors.
 * <p/>
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.redhat.developers.msa.api_gateway;

import org.apache.camel.Exchange;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.stereotype.Component;

@Component
public class CamelServiceRoutes extends RouteBuilder {

    @Override
    public void configure() throws Exception {

        /*
         * Definition of the external services: aloha
         */

        from("direct:aloha")
                .id("aloha")
                .removeHeaders("accept*")
                .setHeader(Exchange.HTTP_METHOD, constant("GET"))
                .setHeader(Exchange.ACCEPT_CONTENT_TYPE, constant("text/plain"))
                .hystrix()
                    .hystrixConfiguration().executionTimeoutInMilliseconds(1000).circuitBreakerRequestVolumeThreshold(5).end()
                    .id("aloha")
                    .groupKey("http://aloha:8080/")
                    .to("http4:aloha:8080/api/aloha?bridgeEndpoint=true&connectionClose=true")
                    .convertBodyTo(String.class)
                .onFallback()
                    .transform().constant("Aloha response (fallback)")
                .end();

        /*
         * Definition of the external services: hola
         */

        from("direct:hola")
                .id("hola")
                .removeHeaders("accept*")
                .setHeader(Exchange.HTTP_METHOD, constant("GET"))
                .setHeader(Exchange.ACCEPT_CONTENT_TYPE, constant("text/plain"))
                .hystrix()
                    .hystrixConfiguration().executionTimeoutInMilliseconds(1000).circuitBreakerRequestVolumeThreshold(5).end()
                    .id("hola")
                    .groupKey("http://hola:8080/")
                    .to("http4:hola:8080/api/hola?bridgeEndpoint=true&connectionClose=true")
                    .convertBodyTo(String.class)
                .onFallback()
                    .transform().constant("Hola response (fallback)")
                .end();

        /*
         * Definition of the external services: ola
         */

        from("direct:ola")
                .id("ola")
                .removeHeaders("accept*")
                .setHeader(Exchange.HTTP_METHOD, constant("GET"))
                .setHeader(Exchange.ACCEPT_CONTENT_TYPE, constant("text/plain"))
                .hystrix()
                    .hystrixConfiguration().executionTimeoutInMilliseconds(1000).circuitBreakerRequestVolumeThreshold(5).end()
                    .id("ola")
                    .groupKey("http://ola:8080/")
                    .to("http4:ola:8080/api/ola?bridgeEndpoint=true&connectionClose=true")
                    .convertBodyTo(String.class)
                .onFallback()
                    .transform().constant("Ola response (fallback)")
                .end();

        /*
         * Definition of the external services: bonjour
         */

        from("direct:bonjour")
                .id("bonjour")
                .removeHeaders("accept*")
                .setHeader(Exchange.HTTP_METHOD, constant("GET"))
                .setHeader(Exchange.ACCEPT_CONTENT_TYPE, constant("text/plain"))
                .hystrix()
                    .hystrixConfiguration().executionTimeoutInMilliseconds(1000).circuitBreakerRequestVolumeThreshold(5).end()
                    .id("bonjour")
                    .groupKey("http://bonjour:8080/")
                    .to("http4:bonjour:8080/api/bonjour?bridgeEndpoint=true&connectionClose=true")
                    .convertBodyTo(String.class)
                .onFallback()
                    .transform().constant("Bonjour response (fallback)")
                .end();

    }

}
