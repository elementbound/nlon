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
  ],

  opts: {
    template: './node_modules/clean-jsdoc-theme',
    theme_opts: {
      default_theme: 'light'
    }
  },

  markdown: {
    idInHeadings: false // important for clean-jsdoc-theme
  }
}
