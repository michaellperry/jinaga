module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-typescript');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    typescript: {
      web: {
        src: ['src/**/*.ts'],
        dest: 'web',
        options: {
          module: 'amd',
          target: 'es5'
        }
      },
      node: {
        src: ['src/**/*.ts'],
        dest: 'node',
        options: {
          module: 'commonjs',
          target: 'es5'
        }
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
        tasks: ['typescript', 'mochaTest']
      },
      test: {
        files: 'test/**/*.js',
        tasks: ['mochaTest']
      }
    }
  });

  grunt.registerTask('default', ['watch']);

}