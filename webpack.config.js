var path = require('path');

module.exports = [
    {
        mode: 'production',
        entry: './src/jinaga-browser.ts',
        devtool: 'source-map',
        module: {
            rules: [{
                test: /\.ts$/,
                use: 'ts-loader'
            }]
        },
        resolve: {
            extensions: [ '.ts', '.js' ]
        },
        output: {
            library: 'jinaga',
            libraryTarget: 'amd',
            path: path.resolve(__dirname, './dist'),
            filename: 'jinaga.js'
        }
    },
    {
        mode: 'production',
        entry: './src/index.ts',
        devtool: 'source-map',
        module: {
            rules: [{
                test: /\.ts$/,
                use: 'ts-loader'
            }]
        },
        resolve: {
            extensions: [ '.ts' ]
        },
        output: {
            libraryTarget: 'commonjs',
            path: path.resolve(__dirname, './dist'),
            filename: 'index.js'
        },
        externals: {
            express: {
                commonjs: 'express'
            },
            pg: {
                commonjs: 'pg'
            },
            keypair: {
                commonjs: 'keypair'
            },
            tweetnacl: {
                commonjs: 'tweetnacl'
            },
            'tweetnacl-util': {
                commonjs: 'tweetnacl-util'
            },
            'node-forge': {
                commonjs: 'node-forge'
            }
        }
    }
]