var path = require('path');

module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    less: {
      build: {
        src: 'assets/less/app.less',
        dest: 'build/app.css'
      }
    },
    concat: {
      build: {
        src: ['bower_components/jquery/jquery.js', 'bower_components/queue-async/queue.js'],
        dest: 'build/app.js'
      }
    },
    watch: {
      less: {
        files: ['assets/less/*.less', 'bower_components/bootstrap/less/*.less'],
        tasks: ['less']
      },
      concat: {
        files: ['bower_components/jquery/jquery.js', 'bower_components/queue-async/queue.js'],
        tasks: ['concat']
      }
    },
    zip: {
      dist: {
        src: [
          'manifest.json',
          'window.html',
          'data/*.json',
          'build/*',
          'assets/icons/*',
          'assets/images/*',
          'assets/js/*.js'
        ],
        dest: 'dist/kanade-chrome.zip',
        router: function (filepath){
          return 'kanade-chrome/' + filepath;
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-zip');
};
