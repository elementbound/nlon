module.exports = {
  source: {
    includePattern: ".+\\.(m)?js(doc)?$",
    excludePattern: ".*node_modules.*"
  },
  sourcetype: "module",

  tags: {
    dictionaries: ["jsdoc", "closure"]
  },

  plugins: [
    "plugins/markdown"
  ]
}
