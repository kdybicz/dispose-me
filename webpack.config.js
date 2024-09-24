const CopyPlugin = require('copy-webpack-plugin');
const glob = require('glob');
const path = require('path');
const ZipPlugin = require("zip-webpack-plugin");

// Automatically find all Lambda entry points
const entry = glob.sync('./service/*.ts').reduce((acc, file) => {
  const name = path.relative('./service', file).replace(/\.ts$/, '');
  acc[name] = file;
  return acc;
}, {});

module.exports = {
  context: __dirname,
  mode: 'production',
  entry: entry,
  // devtool: 'source-map',
  stats: 'normal',
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
    modules: ['node_modules'],
  },
  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, 'dist'),
    filename: '[name]/index.js',
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    usedExports: true,
    providedExports: true,
    sideEffects: true,
    minimize: false,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'service/views', to: 'api/views' },
      ],
    }),
    // compress each service into it's own .zip file
    ...Object.keys(entry).map(entryName => {
      return new ZipPlugin({
        filename: `../${entryName}.zip`,
        include: new RegExp(`${entryName}/.*`),
        pathMapper: function(assetPath) {
          return assetPath.replace(`${entryName}/`, '');
        },
      });
    }),
  ],
};
