var gulp = require('gulp');
var del = require('del');

require('./tasks/client');
require('./tasks/server');

gulp.task('clean', function() {
    return del([ './dist/' ]);
});

gulp.task('default', [ 'compile-client', 'compile-server' ]);