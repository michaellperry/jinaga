module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-typescript');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    typescript: {
      node: {
        src: ['src/**/*.ts', 'typings/**/*.ts'],
        dest: 'node',
        options: {
          module: 'commonjs',
          target: 'es5'
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
        tasks: ['typescript', 'browserify', 'mochaTest']
      },
      test: {
        files: 'test/**/*.js',
        tasks: ['mochaTest']
      }
    }
  });

  grunt.registerTask('default', ['watch']);

}