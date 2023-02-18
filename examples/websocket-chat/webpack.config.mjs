import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import webpack from 'webpack'
import CopyPlugin from 'copy-webpack-plugin'
import NodePolyfillWebpackPlugin from 'node-polyfill-webpack-plugin'
import { createRequire } from 'module'

const scriptDirname = dirname(fileURLToPath(import.meta.url))
const dist = resolve(scriptDirname, 'dist')
const require = createRequire(import.meta.url)

export default {
  entry: {
    client: './src/client.mjs'
  },
  output: {
    filename: '[name].js',
    path: dist
  },
  mode: 'development',
  devtool: 'eval-source-map',

  module: {
    rules: [
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false
        }
      }
    ]
  },

  resolve: {
    fallback: {
      assert: require.resolve('assert-browserify'),
      events: require.resolve('events/'),
      os: require.resolve('os-browserify'),
      stream: require.resolve('stream-browserify'),
      process: require.resolve('process')
    }
  },

  plugins: [
    // Handle 'node:*' imports by replacing them with their regular counterparts
    // which can be polyfilled
    new webpack.NormalModuleReplacementPlugin(/^node:/, resource => {
      resource.request = resource.request.replace(/^node:/, '')
    }),

    new CopyPlugin({
      patterns: [
        { from: './assets/', to: dist }
      ]
    }),

    new webpack.ProvidePlugin({
      process: 'process'
    })
  ],

  devServer: {
    static: './dist'
  }
}
