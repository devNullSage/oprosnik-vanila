const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './oprosnik-extension/src/popup/index.tsx',
    background: './oprosnik-extension/src/background/index.ts',
    'scripts/filler': './oprosnik-extension/src/scripts/filler.ts',
    'scripts/form-modifier': './oprosnik-extension/src/scripts/form-modifier.ts',
    'scripts/parser': './oprosnik-extension/src/scripts/parser.ts',
    'scripts/sidebar-hider': './oprosnik-extension/src/scripts/sidebar-hider.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript'
            ]
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'oprosnik-extension/src/manifest.json', to: 'manifest.json' },
        { from: 'oprosnik-extension/src/popup.html', to: 'popup.html' },
        { from: 'oprosnik-extension/src/css', to: 'css' },
        // Icons are not in src due to file moving limitations
        { from: 'oprosnik-extension/icons', to: 'icons' },
      ]
    })
  ],
  // Add source maps for easier debugging
  devtool: 'cheap-module-source-map',
};
