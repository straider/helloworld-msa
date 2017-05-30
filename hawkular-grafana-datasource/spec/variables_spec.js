import {Variables} from "../variables";
import Q from "q";

describe('Variables', () => {
  const ctx = {
    templateSrv: {},
    variables: {}
  };

  beforeEach(() => {
    ctx.templateSrv = {
        replace: (target, vars) => target
    };
    ctx.variables = new Variables(ctx.templateSrv);
  });

  it('should resolve single variable', done => {
    ctx.templateSrv.replace = (target, vars) => {
      expect(target).to.equal('$app');
      return "{app_1,app_2}";
    };
    const resolved = ctx.variables.resolve("$app/memory/usage", {});
    expect(resolved).to.deep.equal(['app_1/memory/usage', 'app_2/memory/usage']);
    done();
  });

  it('should resolve multiple variables', done => {
    ctx.templateSrv.replace = (target, vars) => {
      if (target === '$app') {
        return "{app_1,app_2}";
      }
      if (target === '$container') {
        return "{1234,5678,90}";
      }
      return target;
    };
    const resolved = ctx.variables.resolve("$app/$container/memory/usage", {});
    expect(resolved).to.deep.equal([
      'app_1/1234/memory/usage',
      'app_2/1234/memory/usage',
      'app_1/5678/memory/usage',
      'app_2/5678/memory/usage',
      'app_1/90/memory/usage',
      'app_2/90/memory/usage'
    ]);
    done();
  });

  it('should resolve to string', done => {
    ctx.templateSrv.replace = (target, vars) => {
      if (target === '$app') {
        return "{app_1,app_2}";
      }
      if (target === '$container') {
        return "{1234,5678,90}";
      }
    };
    const resolved = ctx.variables.resolveToString("app IN [$app] AND container NOT IN ['a', $container, 'z']", {});
    expect(resolved).to.deep.equal("app IN ['app_1','app_2'] AND container NOT IN ['a', '1234','5678','90', 'z']");
    done();
  });
});
