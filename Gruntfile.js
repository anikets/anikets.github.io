module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        files: {
          'assets/<%= pkg.name %>.min.js': 'assets/<%= pkg.name %>.js',
          'assets/modernizr.min.js': 'bower_components/modernizr/modernizr.js',
          'assets/jquery.fittext.min.js': 'assets/jquery.fittext.js'
        }
      }
    },

    htmlmin: {                                     // Task
      dist: {                                      // Target
        options: {                                 // Target options
          removeComments: false,
          collapseWhitespace: true
        },
        files: {                                   // Dictionary of files
          'index.html': 'index-dev.html'       // 'destination': 'source'
        }
      },
      dev: {                                       // Another target
        files: {
          'index.html': 'index-dev.html'
        }
      }
    },

    concat: {
      options: {
        separator: ';',
      },
      dist: {
        src: [
            'bower_components/jquery/dist/jquery.min.js',
            'assets/modernizr.min.js',
            'assets/jquery.fittext.min.js',
            'assets/<%= pkg.name %>.min.js'
          ],
        dest: 'assets/behaviour.min.js',
      },
    },
  });



  // Load the plugin tasks.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  grunt.loadNpmTasks('grunt-contrib-concat');



  // Default task(s).
  grunt.registerTask('default', ['uglify', 'htmlmin', 'concat']);

};
