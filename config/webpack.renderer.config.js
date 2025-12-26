/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';

module.exports = {
  target: 'electron-renderer',
  mode,
  devtool: mode === 'development' ? 'eval-source-map' : 'source-map',
  entry: './src/renderer/index.tsx',
  externalsPresets: { electronRenderer: true },
  externals: {
    'events': 'commonjs events'
  },
  output: {
    path: path.resolve(__dirname, '../build/renderer'),
    filename: 'bundle.js',
    publicPath: './' // 使用相对路径，适合 Electron file:// 协议
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
      inject: 'body',
      scriptLoading: 'blocking' // 使用阻塞方式加载脚本，确保在 DOM 加载前执行
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, '../resources/icons'), to: 'icons' }
      ]
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
      global: 'globalThis'
    })
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, '../src')
    },
    fallback: {
      "fs": false,
      "path": require.resolve('path-browserify'),
      "crypto": require.resolve('crypto-browserify'),
      "stream": require.resolve('stream-browserify'),
      "buffer": require.resolve('buffer'),
      "events": false,
      "child_process": false,
      "util": require.resolve('util'),
      "process": require.resolve('process/browser')
    }
  }
};
