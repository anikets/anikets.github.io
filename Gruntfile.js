module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'assets/<%= pkg.name %>.js',
        dest: 'assets/<%= pkg.name %>.min.js'
      }
    },

    htmlmin: {                                     // Task
      dist: {                                      // Target
        options: {                                 // Target options
          removeComments: false,
          collapseWhitespace: true
        },
        files: {                                   // Dictionary of files
          'index.html': 'src/index-dev.html'       // 'destination': 'source'
        }
      },
      dev: {                                       // Another target
        files: {
          'index.html': 'index-dev.html'
        }
      }
    }
  });



  // Load the plugin tasks.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');



  // Default task(s).
  grunt.registerTask('default', ['uglify', 'htmlmin']);

};
