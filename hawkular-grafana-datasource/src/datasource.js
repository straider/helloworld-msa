import _ from "lodash";
import {Variables} from './variables';
import {Capabilities} from './capabilities';
import {QueryProcessor} from './queryProcessor';
import {modelToString as tagsModelToString} from './tagsKVPairsController';

export class HawkularDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.headers = {
      'Content-Type': 'application/json',
      'Hawkular-Tenant': instanceSettings.jsonData.tenant
    };
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    } else if (typeof instanceSettings.jsonData.token === 'string' && instanceSettings.jsonData.token.length > 0) {
      this.headers['Authorization'] = 'Bearer ' + instanceSettings.jsonData.token;
    }
    this.typeResources = {
      "gauge": "gauges",
      "counter": "counters",
      "availability": "availability"
    };
    this.variables = new Variables(templateSrv);
    this.capabilitiesPromise = this.queryVersion().then(version => new Capabilities(version));
    this.queryProcessor = new QueryProcessor($q, backendSrv, this.variables, this.capabilitiesPromise, this.url, this.headers, this.typeResources);
  }

  query(options) {
    const validTargets = options.targets
      .filter(target => !target.hide)
      .map(target => {
        if (target.id === undefined && target.target !== 'select metric') {
          // backward compatibility
          target.id = target.target;
        } else if (target.id === '-- none --') {
          delete target.id;
        }
        return target;
      })
      .filter(target => target.id !== undefined
         || (target.tags !== undefined && target.tags.length > 0)
         || (target.tagsQL !== undefined && target.tagsQL.length > 0));

    if (validTargets.length === 0) {
      return this.q.when({data: []});
    }

    const promises = validTargets.map(target => this.queryProcessor.run(target, options));

    return this.q.all(promises)
      .then(responses => ({data: _.flatten(responses).sort((m1, m2) => m1.target.localeCompare(m2.target))}));
  }

  testDatasource() {
    return this.backendSrv.datasourceRequest({
      url: this.url + '/metrics',
      method: 'GET',
      headers: this.headers
    }).then(response => {
      if (response.status === 200 || response.status === 204) {
        return { status: "success", message: "Data source is working", title: "Success" };
      } else {
        return { status: "error", message: "Connection failed (" + response.status + ")", title: "Error" };
      }
    });
  }

  annotationQuery(options) {
    return this.backendSrv.datasourceRequest({
      url: this.url + '/strings/raw/query',
      data: {
        start: options.range.from.valueOf(),
        end: options.range.to.valueOf(),
        order: 'ASC',
        ids: [options.annotation.query]
      },
      method: 'POST',
      headers: this.headers
    }).then(response => response.status == 200 ? response.data[0].data : [])
    .then(data => data.map(dp => {
      let annot = {
        annotation: options.annotation,
        time: dp.timestamp,
        title: options.annotation.name,
        tags: undefined,
        text: dp.value
      };
      if (dp.tags) {
        let tags = [];
        for (let key in dp.tags) {
          if (dp.tags.hasOwnProperty(key)) {
            tags.push(dp.tags[key].replace(' ', '_'));
          }
        }
        if (tags.length > 0) {
          annot.tags = tags.join(' ');
        }
      }
      return annot;
    }));
  }

  suggestQueries(target) {
    let url = this.url + '/metrics?type=' + target.type;
    if (target.tagsQL && target.tagsQL.length > 0) {
      url += "&tags=" + this.variables.resolveToString(target.tagsQL, {});
    } else if (target.tags && target.tags.length > 0) {
      url += "&tags=" + tagsModelToString(target.tags, this.variables, {});
    }
    return this.backendSrv.datasourceRequest({
      url: url,
      method: 'GET',
      headers: this.headers
    }).then(response => response.status == 200 ? response.data : [])
    .then(result => {
      return result.map(m => m.id)
        .sort()
        .map(id => {
          return {text: id, value: id};
        });
    });
  }

  suggestTags(type, key) {
    if (!key) {
      return this.q.when([]);
    }
    return this.backendSrv.datasourceRequest({
      url: this.url + '/' + this.typeResources[type] + '/tags/' + key + ':*',
      method: 'GET',
      headers: this.headers
    }).then(result => result.data.hasOwnProperty(key) ? result.data[key] : [])
    .then(tags => tags.map(tag => {
      return {text: tag, value: tag};
    }));
  }

  suggestTagKeys(type) {
    return this.backendSrv.datasourceRequest({
      url: this.url + '/metrics/tags',
      method: 'GET',
      headers: this.headers
    }).then(response => response.status == 200 ? response.data : [])
    .then(result => result.map(key => ({text: key, value: key})));
  }

  metricFindQuery(query) {
    let params = "";
    if (query !== undefined) {
      if (query.substr(0, 5) === "tags/") {
        return this.findTags(query.substr(5).trim());
      }
      if (query.charAt(0) === '?') {
        params = query;
      } else {
        params = "?" + query;
      }
    }
    return this.runWithResolvedVariables(params, p => this.backendSrv.datasourceRequest({
      url: this.url + '/metrics' + p,
      method: 'GET',
      headers: this.headers
    }).then(result => {
      return _.map(result.data, metric => {
        return {text: metric.id, value: metric.id};
      });
    }));
  }

  findTags(pattern) {
    return this.runWithResolvedVariables(pattern, p => this.backendSrv.datasourceRequest({
      url: this.url + '/metrics/tags/' + p,
      method: 'GET',
      headers: this.headers
    }).then(result => {
      let flatTags = [];
      if (result.data) {
        let data = result.data;
        for (let property in data) {
          if (data.hasOwnProperty(property)) {
            flatTags = flatTags.concat(data[property]);
          }
        }
      }
      return flatTags.map(tag => {
        return {text: tag, value: tag};
      });
    }));
  }

  runWithResolvedVariables(target, func) {
    const resolved = this.variables.resolve(target, {});
    return this.q.all(resolved.map(p => func(p)))
      .then(result => _.flatten(result));
  }

  queryVersion() {
    return this.backendSrv.datasourceRequest({
      url: this.url + '/status',
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    }).then(response => response.data['Implementation-Version'])
    .catch(response => "Unknown");
  }

  getCapabilities() {
    return this.capabilitiesPromise;
  }
}
