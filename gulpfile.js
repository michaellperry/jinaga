var del = require('del');
var gulp = require('gulp');

var { compileClient } = require('./tasks/client');
var { compileServer } = require('./tasks/server');
var { compileForTest, compileTest, runTest } = require('./tasks/test');

function clean() {
    return del([ './dist/' ]);
}

gulp.task('clean', clean);

gulp.task('default', gulp.parallel([ compileClient, compileServer ]));

gulp.task('test', gulp.series([ compileForTest, compileTest, runTest ]));