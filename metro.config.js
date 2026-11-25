const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * `@react-three/fiber`'s native build is CommonJS, so Metro resolves bare
 * `three` through the "require" condition to `three/build/three.cjs`. That file
 * calls `process.emitWarning`, which does not exist on Hermes, and throws at
 * import time. Point bare `three` at the ESM build instead.
 */
const THREE_ESM = path.resolve(__dirname, 'node_modules/three/build/three.module.js');

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: THREE_ESM };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
