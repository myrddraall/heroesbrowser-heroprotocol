const {
  resolve
} = require('path');
var path = require('path');
module.exports = [{

    mode: 'development',
    entry: './src/webworker/worker.ts',
    output: {
      filename: 'replay-worker.js',
      path: resolve(__dirname, 'dist/webworker'),
      publicPath: "assets/replay-worker"

    },
    resolve: {
      modules: [
        'src/webworker',
        'node_modules'
      ],
      extensions: [
        '.js',
        '.ts'
      ]
    },
    module: {
      rules: [{
          enforce: 'pre',
          test: /\.js$/,
          use: "source-map-loader",
          "exclude": [
            // instead of /\/node_modules\//
            path.join(process.cwd(), 'node_modules')
          ]
        },
        {
          enforce: 'pre',
          test: /\.ts?$/,
          use: "source-map-loader"
        },
        {
          // For our normal typescript
          test: /\.ts?$/,
          use: [{
            loader: 'awesome-typescript-loader',
            options: {
              configFileName: './src/webworker/tsconfig.json'
            }
          }],
          exclude: /(?:node_modules)/,
        },
      ]
    },
    plugins: [],
    devtool: 'inline-source-map'
  },
  {

    mode: 'production',
    entry: './src/webworker/worker.ts',
    output: {
      filename: 'replay-worker.min.js',
      path: resolve(__dirname, 'dist/webworker'),
      publicPath: "assets/replay-worker"

    },
    resolve: {
      modules: [
        'src/webworker',
        'node_modules'
      ],
      extensions: [
        '.js',
        '.ts'
      ]
    },
    module: {
      rules: [{
        // For our normal typescript
        test: /\.ts?$/,
        use: [{
          loader: 'awesome-typescript-loader',
          options: {
            configFileName: './src/webworker/tsconfig.json'
          }
        }],
        exclude: /(?:node_modules)/,
      }, ]
    },
    plugins: []
  }
];