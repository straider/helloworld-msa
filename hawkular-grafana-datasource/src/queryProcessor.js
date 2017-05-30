import {modelToString as tagsModelToString} from './tagsKVPairsController';

export class QueryProcessor {

  constructor(q, backendSrv, variables, capabilities, url, headers, typeResources) {
    this.q = q;
    this.backendSrv = backendSrv;
    this.variables = variables;
    this.capabilities = capabilities;
    this.url = url;
    this.headers = headers;
    this.typeResources = typeResources;
    this.numericMapping = point => [point.value, point.timestamp];
    this.availMapping = point => [point.value == 'up' ? 1 : 0, point.timestamp];
  }

  run(target, options) {
    return this.capabilities.then(caps => {
      let postData = {
        start: options.range.from.valueOf(),
        end: options.range.to.valueOf(),
        order: 'ASC'
      };
      let multipleMetrics = true;
      if (target.id) {
        const metricIds = this.variables.resolve(target.id, options);
        if (caps.QUERY_POST_ENDPOINTS) {
          if (!target.seriesAggFn || target.seriesAggFn === 'none') {
            postData.ids = metricIds;
            return this.rawQuery(target, postData);
          } else if (target.timeAggFn == 'live') {
            // Need to change postData
            return this.singleStatLiveQuery(target, {ids: metricIds, limit: 1});
          } else {
            // Need to perform multiple series aggregation
            postData.metrics = metricIds;
            return this.singleStatQuery(target, postData);
          }
        } else {
          return this.rawQueryLegacy(target, options.range, metricIds);
        }
      } else {
        if (caps.TAGS_QUERY_LANGUAGE) {
          if (target.tagsQL !== undefined && target.tagsQL.length > 0) {
            postData.tags = this.variables.resolveToString(target.tagsQL, options);
          } else {
            return this.q.when([]);
          }
        } else {
          if (target.tags !== undefined && target.tags.length > 0) {
            postData.tags = tagsModelToString(target.tags, this.variables, options);
          } else {
            return this.q.when([]);
          }
        }
        if (!target.seriesAggFn || target.seriesAggFn === 'none') {
          return this.rawQuery(target, postData);
        } else if (target.timeAggFn == 'live') {
          // Need to change postData
          return this.singleStatLiveQuery(target, {tags: postData.tags, limit: 1});
        } else {
          // Need to perform multiple series aggregation
          return this.singleStatQuery(target, postData);
        }
      }
    });
  }

  rawQuery(target, postData) {
    const uri = [
      this.typeResources[target.type],   // gauges or counters
      target.rate ? 'rate' : 'raw', // raw or rate
      'query'
    ];
    const url = this.url + '/' + uri.join('/');

    return this.backendSrv.datasourceRequest({
      url: url,
      data: postData,
      method: 'POST',
      headers: this.headers
    }).then(response => this.processRawResponse(target, response.status == 200 ? response.data : []));
  }

  rawQueryLegacy(target, range, metricIds) {
    return this.q.all(metricIds.map(metric => {
      const uri = [
        this.typeResources[target.type],  // gauges, counters or availability
        encodeURIComponent(metric).replace('+', '%20'), // metric name
        'data'];
      const url = this.url + '/' + uri.join('/');

      return this.backendSrv.datasourceRequest({
        url: url,
        params: {
          start: range.from.valueOf(),
          end: range.to.valueOf()
        },
        method: 'GET',
        headers: this.headers
      }).then(response => this.processRawResponseLegacy(target, metric, response.status == 200 ? response.data : []));
    }));
  }

  processRawResponse(target, data) {
    return data.map(timeSerie => {
      return {
        refId: target.refId,
        target: timeSerie.id,
        datapoints: timeSerie.data.map(target.type == 'availability' ? this.availMapping : this.numericMapping)
      };
    });
  }

  processRawResponseLegacy(target, metric, data) {
    let datapoints;
    if (target.type == 'availability') {
      datapoints = data.map(this.availMapping);
    } else if (!target.rate) {
      datapoints = data.map(this.numericMapping);
    } else {
      let sortedData = data.sort((p1, p2)=> p1.timestamp - p2.timestamp);
      datapoints = _.chain(sortedData)
        .zip(sortedData.slice(1))
        .filter(pair => {
          return pair[1] // Exclude the last pair
            && (target.type != 'counter' || pair[0].value <= pair[1].value); // Exclude counter resets
        })
        .map(pair => {
          let point1 = pair[0], point2 = pair[1];
          let timestamp = point2.timestamp;
          let value_diff = point2.value - point1.value;
          let time_diff = point2.timestamp - point1.timestamp;
          let rate = 60000 * value_diff / time_diff;
          return [rate, timestamp];
        })
        .value();
    }
    return {
      refId: target.refId,
      target: metric,
      datapoints: datapoints
    };
  }

  singleStatQuery(target, postData) {
    // Query for singlestat => we just ask for a single bucket
    // But because of that we need to override Grafana behaviour, and manage ourselves the min/max/avg/etc. selection
    let fnBucket;
    if (target.timeAggFn == 'avg') {
      fnBucket = bucket => bucket.avg;
    } else if (target.timeAggFn == 'min') {
      fnBucket = bucket => bucket.min;
    } else if (target.timeAggFn == 'max') {
      fnBucket = bucket => bucket.max;
    } // no else case. "live" case was handled before
    const url = this.url + '/' + this.typeResources[target.type] + '/stats/query';
    delete postData.order;
    postData.buckets = 1;
    postData.stacked = target.seriesAggFn === 'sum';
    return this.backendSrv.datasourceRequest({
      url: url,
      data: postData,
      method: 'POST',
      headers: this.headers
    }).then(response => this.processSingleStatResponse(target, fnBucket, response.status == 200 ? response.data : []));
  }

  processSingleStatResponse(target, fnBucket, data) {
    return data.map(bucket => {
      return {
        refId: target.refId,
        target: "Aggregate",
        datapoints: [[fnBucket(bucket), bucket.start]]
      };
    });
  }

  singleStatLiveQuery(target, postData) {
    const uri = [
      this.typeResources[target.type], // gauges, counters or availability
      target.rate ? 'rate' : 'raw', // raw or rate
      'query'
    ];
    const url = this.url + '/' + uri.join('/');
    // Set start to now - 5m
    postData.start = Date.now() - 300000;
    return this.backendSrv.datasourceRequest({
      url: url,
      data: postData,
      method: 'POST',
      headers: this.headers
    }).then(response => this.processSingleStatLiveResponse(target, response.status == 200 ? response.data : []));
  }

  processSingleStatLiveResponse(target, data) {
    let reduceFunc;
    if (target.seriesAggFn === 'sum') {
      reduceFunc = (presentValues => presentValues.reduce((a,b) => a+b));
    } else {
      reduceFunc = (presentValues => presentValues.reduce((a,b) => a+b) / presentValues.length);
    }
    let datapoints;
    const latestPoints = data.filter(timeSeries => timeSeries.data.length > 0)
        .map(timeSeries => timeSeries.data[0]);
    if (latestPoints.length === 0) {
      datapoints = [];
    } else {
      datapoints = [[reduceFunc(latestPoints.map(dp => dp.value)), latestPoints[0].timestamp]];
    }
    return [{
      refId: target.refId,
      target: "Aggregate",
      datapoints: datapoints
    }];
  }
}
