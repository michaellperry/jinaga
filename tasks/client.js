var gulp = require('gulp');
var typescript = require('gulp-typescript');
var merge = require('merge2');

gulp.task('compile-client', function() {
  var tsResult = gulp.src('./src/**/*.ts')
      .pipe(typescript({
        module: "amd",
        target: "es6",
        moduleResolution: "node",
        noImplicitAny: true,
        declaration: true,
        outDir: "./dist/client",
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
    tsResult.dts.pipe(gulp.dest('./dist/client/')),
    tsResult.js.pipe(gulp.dest('./dist/client/'))
  ]
});
