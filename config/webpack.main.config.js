/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const webpack = require('webpack');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';

module.exports = {
  target: 'electron-main',  // 使用electron-main目标
  mode,
  devtool: mode === 'development' ? 'eval-source-map' : 'source-map',
  stats: {
    // 忽略 PluginManager 中的动态 require 警告
    warningsFilter: /Critical dependency: request of a dependency is an expression/,
  },
  entry: './src/main/index.ts',
  output: {
    path: path.resolve(__dirname, '../build/main'),
    filename: 'index.js',
    libraryTarget: 'commonjs2'
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
    ],
  },
  // 使用webpack-node-externals来排除node_modules
  externals: {
    // 排除electron，让它在运行时被正确加载
    'electron': 'commonjs electron',
    // 排除其他node_modules
    'uuid': 'commonjs uuid',
    'fs': 'commonjs fs',
    'path': 'commonjs path',
    'fs/promises': 'commonjs fs/promises',
    'child_process': 'commonjs child_process',
    'util': 'commonjs util',
    // 排除 fsevents（macOS 专用，Windows 上不需要）
    'fsevents': 'commonjs fsevents'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.ELECTRON_IS_DEV': JSON.stringify(mode === 'development')
    }),
    // 忽略 PluginManager 中的动态 require 警告
    new webpack.IgnorePlugin({
      resourceRegExp: /PluginManager\.ts$/,
    })
  ],
  node: {
    __dirname: false,
    __filename: false
  }
};
