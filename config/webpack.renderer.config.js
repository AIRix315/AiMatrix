const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';

module.exports = {
  target: 'electron-renderer',
  mode,
  devtool: mode === 'development' ? 'eval-source-map' : 'source-map',
  entry: './src/renderer/index.tsx',
  output: {
    path: path.resolve(__dirname, '../build/renderer'),
    filename: 'bundle.js',
    publicPath: './'
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
        test: /\.(png|jpe?g|gif|svg)$/,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html'
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser'
    })
  ],
  devServer: {
    port: 3001,
    hot: true,
    historyApiFallback: true,
    static: {
      directory: path.resolve(__dirname, '../build/renderer'),
      publicPath: '/'
    },
    devMiddleware: {
      writeToDisk: true
    }
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, '../src')
    },
    fallback: {
      "fs": false,
      "path": false,
      "crypto": false,
      "child_process": false,
      "util": false,
      "process": require.resolve('process/browser')
    }
  }
};
