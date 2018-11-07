var gulp = require('gulp');
var webpackStream = require('webpack-stream');
var webpack = require('webpack');
var path = require('path');

var webpackConfig = {
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
        path: path.resolve(__dirname, '../dist'),
        filename: 'jinaga.js'
    }
};

function compileClient() {
    return gulp.src('./src/jinaga-browser.ts')
        .pipe(webpackStream(webpackConfig, webpack))
        .pipe(gulp.dest('./dist'));
}

module.exports = {
    compileClient
};