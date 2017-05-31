package com.redhat.developers.msa.namaste;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.dropwizard.Configuration;
import io.dropwizard.server.DefaultServerFactory;
import io.dropwizard.server.ServerFactory;

public class NamasteConfiguration extends Configuration {

    /**
     * Returns the server-specific section of the configuration file.
     *
     * @return server-specific configuration parameters
     */
    @JsonProperty("server")
    public ServerFactory getServerFactory() {
        DefaultServerFactory sf = new DefaultServerFactory();
        sf.setJerseyRootPath("/api/*");
        return sf;
    }
}
