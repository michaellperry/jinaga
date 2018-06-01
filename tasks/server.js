var gulp = require('gulp');
var typescript = require('gulp-typescript');
var merge = require('merge2');

gulp.task('compile-server', function() {
  var tsResult = gulp.src('./src/**/*.ts')
      .pipe(typescript({
        module: "commonjs",
        target: "es6",
        moduleResolution: "node",
        noImplicitAny: true,
        declaration: true,
        outDir: "./dist/server",
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
    tsResult.dts.pipe(gulp.dest('./dist/server')),
    tsResult.js.pipe(gulp.dest('./dist/server'))
  ]
});
