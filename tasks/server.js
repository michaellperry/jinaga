var gulp = require('gulp');
var webpackStream = require('webpack-stream');
var webpack = require('webpack');
var path = require('path');

var webpackConfig = {
    mode: 'production',
    entry: './src/index.ts',
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
        library: 'jinaga',
        libraryTarget: 'commonjs',
        path: path.resolve(__dirname, '../dist'),
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
        }
    }
};

gulp.task('compile-server', function() {
    return gulp.src('./src/index.ts')
        .pipe(webpackStream(webpackConfig, webpack))
        .pipe(gulp.dest('./dist'));
});