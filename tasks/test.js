var gulp = require('gulp');
var ts = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');
var mocha = require('gulp-mocha');
var path = require('path');

var config = {
    module: "commonjs",
    target: "es6",
    noImplicitAny: true,
    moduleResolution: "node",
    sourceMap: true,
    rootDir: "..",
    baseUrl: "..",
    lib: ["dom", "es2015"],
    paths: {
        "*": [
            path.join(__dirname, "../node_modules/*"),
            path.join(__dirname, "../types/*")
        ]
    }
};

function continueOnError(err) {
    console.log(err.toString());
    this.emit('end');
}

function compileForTest() {
    return gulp.src('./src/**/*.ts')
        .pipe(sourcemaps.init())
        .pipe(ts(config))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/test/src'));
}

function compileTest() {
    return gulp.src('./test/**/*.ts')
        .pipe(sourcemaps.init())
        .pipe(ts(config))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/test/test'));
}

function runTest() {
    return gulp.src('./dist/test/**/*.js')
        .pipe(mocha({
            reporter: 'min'
        })
        .on("error", continueOnError));
}

var test = gulp.series(
    gulp.parallel(compileForTest, compileTest),
    runTest);

gulp.task('test', test);

function waitForTestChanges() {
    return gulp.watch(['./src/**/*.ts', './test/**/*.ts'], test);
}

gulp.task('watch', gulp.series(test, waitForTestChanges));

module.exports = {
    test
};