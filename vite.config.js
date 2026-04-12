const path = require("node:path");

module.exports = {
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "hr-compliance-compass.html"),
    },
  },
};
