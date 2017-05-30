import {Datasource} from "../module";
import Q from "q";

describe('HawkularDatasource with tagsQL', () => {
  const ctx = {};
  const hProtocol = 'https';
  const hHostname = 'test.com';
  const hPort = '876';
  const hPath = 'hawkular/metrics';
  const instanceSettings = {
    url: hProtocol + '://' + hHostname + ':' + hPort + '/' + hPath,
    jsonData: {
      tenant: 'test-tenant'
    }
  };

  const parsePathElements = request => {
    expect(request.method).to.equal('POST');
    expect(request.headers).to.have.property('Hawkular-Tenant', instanceSettings.jsonData.tenant);

    const parser = document.createElement('a');
    parser.href = request.url;

    expect(parser).to.have.property('protocol', hProtocol + ':');
    expect(parser).to.have.property('hostname', hHostname);
    expect(parser).to.have.property('port', hPort);
    expect(parser).to.have.property('pathname');

    return parser.pathname.split('/').filter(e => e.length != 0);
  }

  beforeEach(() => {
    ctx.$q = Q;
    ctx.backendSrv = {};
    ctx.backendSrv.datasourceRequest = request => {
      return ctx.$q.when({data: {'Implementation-Version': '0.24.0'}})
    };
    ctx.templateSrv = {
        replace: (target, vars) => target
    };
    ctx.ds = new Datasource(instanceSettings, ctx.$q, ctx.backendSrv, ctx.templateSrv);
  });

  it('should return an empty array when no targets are set', done => {
    ctx.ds.query({targets: []}).then(result => {
      expect(result).to.have.property('data').with.length(0);
    }).then(v => done(), err => done(err));
  });

  it('should query by tags QL', done => {
    const options = {
      range: {
        from: 15,
        to: 30
      },
      targets: [{
        tagsQL: 'type=memory AND host=myhost',
        type: 'gauge',
        rate: false
      }]
    };

    ctx.backendSrv.datasourceRequest = request => {
      const pathElements = parsePathElements(request);
      expect(pathElements).to.have.length(5);
      expect(pathElements.slice(0, 2)).to.deep.equal(hPath.split('/'));
      expect(pathElements.slice(2)).to.deep.equal(['gauges', 'raw', 'query']);
      expect(request.data).to.deep.equal({
        start: options.range.from,
        end: options.range.to,
        tags: 'type=memory AND host=myhost',
        order: 'ASC'
      });

      return ctx.$q.when({
        status: 200,
        data: []
      });
    };

    ctx.ds.query(options).then(v => done(), err => done(err));
  });

  it('should return aggregated stats by tags QL', done => {

    const options = {
      range: {
        from: 15,
        to: 30
      },
      targets: [{
        seriesAggFn: 'sum',
        timeAggFn: 'max',
        tagsQL: 'type=memory',
        type: 'gauge',
        rate: false
      }]
    };

    ctx.backendSrv.datasourceRequest = request => {
      const pathElements = parsePathElements(request);
      expect(pathElements).to.have.length(5);
      expect(pathElements.slice(0, 2)).to.deep.equal(hPath.split('/'));
      expect(pathElements.slice(2)).to.deep.equal(['gauges', 'stats', 'query']);
      expect(request.data).to.deep.equal({
        start: options.range.from,
        end: options.range.to,
        tags: 'type=memory',
        buckets: 1,
        stacked: true
      });

      return ctx.$q.when({
        status: 200,
        data: []
      });
    };

    ctx.ds.query(options).then(v => done(), err => done(err));
  });

  it('should return live stats with tagsQL', done => {

    const options = {
      range: {
        from: 15,
        to: 30
      },
      targets: [{
        seriesAggFn: 'sum',
        timeAggFn: 'live',
        tagsQL: 'type=memory',
        type: 'gauge',
        rate: false
      }]
    };

    ctx.backendSrv.datasourceRequest = request => {
      const pathElements = parsePathElements(request);
      expect(pathElements).to.have.length(5);
      expect(pathElements.slice(0, 2)).to.deep.equal(hPath.split('/'));
      expect(pathElements.slice(2)).to.deep.equal(['gauges', 'raw', 'query']);
      expect(request.data.limit).to.equal(1);
      expect(request.data.tags).to.equal('type=memory');

      return ctx.$q.when({
        status: 200,
        data: []
      });
    };

    ctx.ds.query(options).then(v => done(), err => done(err));
  });
});
