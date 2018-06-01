var gulp = require('gulp');
var del = require('del');

require('./tasks/compile');

gulp.task('clean', function() {
    return del([ './dist/' ]);
});

gulp.task('default', [ 'compile' ]);