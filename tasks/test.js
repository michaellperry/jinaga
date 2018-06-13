var gulp = require('gulp');
var ts = require('gulp-typescript');
var mocha = require('gulp-mocha');
var path = require('path');

var config = {
    module: "commonjs",
    target: "es6",
    noImplicitAny: true,
    moduleResolution: "node",
    rootDir: "..",
    baseUrl: "..",
    lib: [ "dom", "es2015" ],
    paths: {
        "*": [
            path.join(__dirname, "../node_modules/*"),
            path.join(__dirname, "../types/*")
        ]
    }
};

function compileForTest() {
    return gulp.src('./src/**/*.ts')
        .pipe(ts(config))
        .pipe(gulp.dest('./dist/test/src'));
}

function compileTest() {
    return gulp.src('./test/**/*.ts')
        .pipe(ts(config))
        .pipe(gulp.dest('./dist/test/test'));
}

function runTest() {
    return gulp.src('./dist/test/**/*.js')
        .pipe(mocha({
            reporter: 'min'
        }));
}

module.exports = {
    compileForTest,
    compileTest,
    runTest
};