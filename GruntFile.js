module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ts: {
      node: {
        src: ['src/**/*.ts', 'typings/**/*.ts'],
        dest: 'node',
        options: {
          module: 'commonjs',
          target: 'es5',
          rootDir: 'src'
        }
      }
    },
    browserify: {
      web: {
        src: ['node/client.js'],
        dest: 'web/jinaga.js'
      }
    },
    mochaTest : {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/**/*.js']
      }
    },
    watch: {
      compile: {
        files: 'src/**/*.ts',
        tasks: ['ts', 'browserify', 'mochaTest']
      },
      test: {
        files: 'test/**/*.js',
        tasks: ['mochaTest']
      }
    }
  });

  grunt.registerTask('build', ['ts', 'browserify', 'mochaTest']);
  grunt.registerTask('default', ['build']);

}