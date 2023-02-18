import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import CopyPlugin from 'copy-webpack-plugin'

const scriptDirname = dirname(fileURLToPath(import.meta.url))
const dist = resolve(scriptDirname, 'dist')

export default {
  entry: {
    client: './src/client.mjs'
  },
  output: {
    filename: '[name].js',
    path: dist
  },
  mode: 'production',

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

  plugins: [
    new CopyPlugin({
      patterns: [
        { from: './assets/', to: dist }
      ]
    })
  ],

  devServer: {
    static: './dist'
  }
}
