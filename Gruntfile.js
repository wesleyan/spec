module.exports = function(grunt) {
    // load tasks
    [   'grunt-contrib-uglify',
        'grunt-contrib-cssmin',
        'grunt-contrib-jshint',
        'grunt-contrib-concat',
        'grunt-contrib-watch'
    ].forEach(function(task) {
        grunt.loadNpmTasks(task);
    });

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            stuff: {
              files: {
                'public/dist/js/db.js': ['public/src/js/db/*.js'],
                'public/dist/js/plugins.js': ['public/src/js/plugins/*.js'],
              },
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("dd-mm-yyyy") %> */\n',
                mangle: true
            },
            dist: {
                files: {
                    'public/dist/js/spec.min.js': ['public/src/js/spec.js'],
                    'public/dist/js/db.min.js': ['public/dist/js/db.js'],
                    'public/dist/js/plugins.min.js': ['public/dist/js/plugins.js']
                }
            },
            managerPages: {
              files: [{
                  expand: true,
                  cwd: 'public/src/js/manager',
                  src: '**/*.js',
                  dest: 'public/dist/js/manager',
                  ext: '.min.js'
              }]
            }
        },
        jshint: {
            files: ['Gruntfile.js', 'public/src/js/spec.js', 'public/src/js/manager/*.js'], //no need to lint plugins
            options: {
                // options here to override JSHint defaults
                globals: {
                    jQuery: true,
                    console: true,
                    module: true,
                    document: true
                }
            }
        },
        cssmin: {
            options: {
                banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
            },
            combine: {
                files: {
                      'public/dist/css/db.min.css': ['public/src/css/db/*.css'],
                    'public/dist/css/manager.min.css': ['public/src/css/manager/*.css'],
                    'public/dist/css/plugins.min.css': ['public/src/css/plugins/*.css'],
                }
            },
            minify: {
                expand: true,
                cwd: 'public/src/css/',
                src: ['*.css', '!*.min.css'],
                dest: 'public/dist/css/',
                ext: '.min.css'
            }
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint']
        }
    });

    grunt.registerTask('buildjs', ['jshint', 'concat', 'uglify']);
    grunt.registerTask('buildcss', ['cssmin']);

    grunt.registerTask('default', ['buildjs', 'buildcss']);

};