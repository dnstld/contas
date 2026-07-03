const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// expo-sqlite on web loads its wa-sqlite engine as a .wasm asset; Metro doesn't
// resolve that extension by default.
config.resolver.assetExts.push('wasm');

// wa-sqlite's web worker needs SharedArrayBuffer, which requires the page to be
// cross-origin isolated.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
