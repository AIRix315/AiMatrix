/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';

module.exports = {
  target: 'electron-preload',
  mode,
  devtool: mode === 'development' ? 'eval-source-map' : 'source-map',
  entry: './src/preload/index.ts',
  output: {
    path: path.resolve(__dirname, '../build/preload'),
    filename: 'index.js'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, '../src')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  node: {
    __dirname: false,
    __filename: false
  },
  externals: {
    'electron': 'commonjs electron'
  }
};
