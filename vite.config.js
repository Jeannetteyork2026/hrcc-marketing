const path = require("node:path");

module.exports = {
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.html"),
        main: path.resolve(__dirname, "hr-compliance-compass.html"),
        privacy: path.resolve(__dirname, "privacy.html"),
        terms: path.resolve(__dirname, "terms.html"),
        thanks: path.resolve(__dirname, "thanks.html"),
        login: path.resolve(__dirname, "Login.html"),
      },
    },
  },
};
