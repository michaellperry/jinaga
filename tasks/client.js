var gulp = require('gulp');
var webpackStream = require('webpack-stream');
var webpack = require('webpack');
var path = require('path');

var webpackConfig = {
    mode: 'production',
    entry: './src/jinaga-browser.ts',
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
        path: path.resolve(__dirname, 'dist'),
        filename: 'jinaga.js'
    }
};

gulp.task('compile-client', function() {
    return gulp.src('./src/jinaga-browser.ts')
        .pipe(webpackStream(webpackConfig, webpack))
        .pipe(gulp.dest('./dist'));
});