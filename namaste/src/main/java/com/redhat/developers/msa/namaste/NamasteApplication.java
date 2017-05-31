/**
 * JBoss, Home of Professional Open Source
 * Copyright 2016, Red Hat, Inc. and/or its affiliates, and individual
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
package com.redhat.developers.msa.namaste;

import java.util.EnumSet;

import javax.servlet.DispatcherType;
import javax.servlet.Filter;
import javax.servlet.FilterRegistration;
import javax.servlet.FilterRegistration.Dynamic;

import org.eclipse.jetty.servlets.CrossOriginFilter;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.github.kristofa.brave.Brave;
import com.github.kristofa.brave.EmptySpanCollectorMetricsHandler;
import com.github.kristofa.brave.http.DefaultSpanNameProvider;
import com.github.kristofa.brave.http.HttpSpanCollector;
import com.github.kristofa.brave.servlet.BraveServletFilter;
import com.netflix.hystrix.contrib.metrics.eventstream.HystrixMetricsStreamServlet;

import io.dropwizard.Application;
import io.dropwizard.assets.AssetsBundle;
import io.dropwizard.bundles.webjars.WebJarBundle;
import io.dropwizard.setup.Bootstrap;
import io.dropwizard.setup.Environment;
import io.swagger.jaxrs.config.BeanConfig;
import io.swagger.jaxrs.listing.ApiListingResource;

public class NamasteApplication extends Application<NamasteConfiguration> {

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            new NamasteApplication().run("server");
        }
        new NamasteApplication().run(args);
        System.out.println("Service running at 0.0.0.0:8080");
    }

    @Override
    public void initialize(Bootstrap<NamasteConfiguration> bootstrap) {
        bootstrap.addBundle(new AssetsBundle("/assets/", "/"));
        bootstrap.addBundle(new WebJarBundle());
    }

    @Override
    public void run(NamasteConfiguration configuration, Environment environment) throws Exception {
        // Register Namaste REST service
        environment.jersey().register(new NamasteResource());

        // Enable CORS filter
        FilterRegistration.Dynamic filter = environment.servlets().addFilter("CORSFilter", CrossOriginFilter.class);
        filter.addMappingForUrlPatterns(EnumSet.allOf(DispatcherType.class), false, environment.getApplicationContext().getContextPath() + "*");

        // Register HystrixMetricsStreamServlet
        environment.getApplicationContext().addServlet(HystrixMetricsStreamServlet.class, "/hystrix.stream");

        // Register BraveServletFilter
        Brave brave = new Brave.Builder("namaste")
            .spanCollector(HttpSpanCollector.create(System.getenv("ZIPKIN_SERVER_URL"),
            		new EmptySpanCollectorMetricsHandler()))
            .build();
        Filter braveFilter = new BraveServletFilter(brave.serverRequestInterceptor(), brave.serverResponseInterceptor(), new DefaultSpanNameProvider());
        Dynamic filterRegistration = environment.servlets().addFilter("BraveServletFilter", braveFilter);
        // Explicit mapping to avoid trace on readiness probe
        filterRegistration.addMappingForUrlPatterns(EnumSet.allOf(DispatcherType.class), false, "/api/namaste", "/api/namaste-chaining");

        // Configure Swagger
        environment.jersey().register(new ApiListingResource());
        environment.getObjectMapper().setSerializationInclusion(JsonInclude.Include.NON_NULL);
        BeanConfig beanConfig = new BeanConfig();
        beanConfig.setVersion("1.0.0");
        beanConfig.setSchemes(new String[] { "http" });
        beanConfig.setTitle("Namaste microservices REST API");
        beanConfig.setDescription("Operations that can be invoked in the namaste microservices");
        beanConfig.setResourcePackage("com.redhat.developers.msa.namaste");
        beanConfig.setLicense("Apache 2.0");
        beanConfig.setLicenseUrl("http://www.apache.org/licenses/LICENSE-2.0.html");
        beanConfig.setContact("developer@redhat.com");
        beanConfig.setBasePath("/api");
        beanConfig.setPrettyPrint(true);
        beanConfig.setScan(true);
    }

}
