const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

// Compile the actual app modules. Mock device APIs, not business logic.
module.exports = function createLoader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
      filename, configFile: false, babelrc: false,
      plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
    });
    const customRequire = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('.')) {
        const target = path.resolve(path.dirname(filename), name);
        if (Object.hasOwn(mocks, target)) return mocks[target];
        return load(target.endsWith('.js') ? target : `${target}.js`);
      }
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(customRequire, module, module.exports);
    return module.exports;
  }
  return load;
};
