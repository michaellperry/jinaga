var gulp = require('gulp');
var ts = require('gulp-typescript');
var mocha = require('gulp-mocha');

function compileTest() {
    return gulp.src('./test/**/*.ts')
        .pipe(ts({
            module: "commonjs",
            target: "es6",
            noImplicitAny: true,
            moduleResolution: "node",
            rootDir: "..",
            baseUrl: "..",
            lib: [ "dom", "es2015" ],
            paths: {
                "*": [
                    "./node_modules/*",
                    "./types/*"
                ]
            }
        }))
        .pipe(gulp.dest('./dist/test'));
}

function runTest() {
    return gulp.src('./dist/test/**/*.js')
        .pipe(mocha({
            reporter: 'min'
        }));
}

module.exports = {
    compileTest,
    runTest
};