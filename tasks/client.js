var gulp = require('gulp');
var typescript = require('gulp-typescript');
var merge = require('merge2');

gulp.task('compile-client', function() {
  var tsResult = gulp.src('./src/jinaga.ts')
      .pipe(typescript({
        module: "system",
        target: "es6",
        moduleResolution: "node",
        noImplicitAny: true,
        declaration: true,
        outFile: "index.js",
        baseUrl: ".",
        lib: [ "dom", "es2015" ],
        paths: {
          "*": [
            "./node_modules/*",
            "./types/*"
          ]
        }
      }));

  return merge[
    tsResult.dts.pipe(gulp.dest('./dist/')),
    tsResult.js.pipe(gulp.dest('./dist/'))
  ]
});
