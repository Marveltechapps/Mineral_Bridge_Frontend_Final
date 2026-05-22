const { withAndroidManifest } = require('@expo/config-plugins');

/** Force HTTP cleartext in release APKs (required for http:// API until HTTPS is used). */
function withAndroidCleartext(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) {
      app.$['android:usesCleartextTraffic'] = 'true';
    }
    return cfg;
  });
}

module.exports = withAndroidCleartext;
