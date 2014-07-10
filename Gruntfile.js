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
    require('time-grunt')(grunt);

    var files = {
        gruntfile: ['Gruntfile.js'],
        frontjs: ['public/src/js/spec.js', 'public/src/js/manager/*.js'], //to be compressed
        backjs: ['specapp.js','routes/**/*.js', 'modules/**/*.js'],
    };

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            stuff: {
              files: {
                'public/dist/js/db.js': ['public/src/js/db/*.js'],
                'public/dist/js/plugins.js': ['public/src/js/plugins/*.js'],
              },
              options: {
                // Replace all 'use strict' statements in the code with a single one at the top
                // banner: "'use strict';\n",
                process: function(src, filepath) {
                  return '// Source: ' + filepath + '\n' +
                    src.replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1');
                },
              },
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= pkg.version %> */\n',
                mangle: {
                          except: ['Spec']
                        }
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
            //Front end files
            //no need to lint plugins
            files: [].concat(files.frontjs, files.gruntfile),
            ignore_warning: {
                options: {
                  '-W030': true,
                  '-W002': true
                },
                src: files.backjs, //Back end files
            },
            options: {
                // options here to override JSHint defaults
                ignores: ['public/src/js/manager/invoice.js'],
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
                banner: '/*! <%= pkg.name %> <%= pkg.version %> */\n'
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
            frontjs: {
              files: files.frontjs,
              tasks: ['buildjs']
            },
            otherjs: {
              files: [].concat(files.backjs, files.gruntfile),
              tasks: ['jshint']
            },
            css: {
              files: 'public/src/css/*',
              tasks: ['buildcss']
            }
        }
    });

    grunt.registerTask('buildjs', ['jshint', 'concat', 'uglify']);
    grunt.registerTask('buildcss', ['cssmin']);

    grunt.registerTask('default', ['buildjs', 'buildcss']);

};
