module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      node: ['node/*', '!node/.npmignore', '!node/package.json', '!node/README.md']
    },
    ts: {
      node: {
        src: ['src/**/*.ts', 'typings/**/*.ts'],
        dest: 'node',
        options: {
          module: 'commonjs',
          target: 'es5',
          rootDir: 'src',
          noUnusedLocals: true,
          noImplicitAny: true,
          declaration: true
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
      integration: {
        options: {
          reporter: 'spec'
        },
        src: ['test/integration/**/*.js']
      },
      unit: {
        options: {
          reporter: 'spec'
        },
        src: ['test/unit/**/*.js']
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

  grunt.registerTask('build', ['clean', 'ts', 'browserify', 'mochaTest']);
  grunt.registerTask('default', ['build']);
  grunt.registerTask('ci', ['clean', 'ts', 'mochaTest:unit']);

}