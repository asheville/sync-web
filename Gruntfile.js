module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    index_file: 'app/index.html',
    lib_files: [
      'bower_components/*'
    ],
    app_source_files: [
      'app/**/*.js'
    ],
    app_build_files: [
      'build/lib.js',
      'build/**/*.js'
    ],
    style_source_files: [
      '!app/styles/styles.less',
      'app/styles/imports.less',
      'app/styles/reset.less',
      'app/styles/breakpoints.less',
      'app/styles/**/*'
    ],
    style_build_files: [
      'build/**/*.css'
    ],
    template_files: [
      'app/templates/**/*.hbs'
    ],
    images_dir: 'app/images',
    image_files: [
      '<%= images_dir %>/**/*'
    ],
    watch_files: [
      '<%= index_file %>',
      '<%= lib_files %>',
      '<%= app_source_files %>',
      '<%= style_source_files %>',
      '<%= template_files %>',
      '<%= image_files %>'
    ],
    clean: {
      pre: [
        'public/*',
        '!.git'
      ],
      post: [
        'build'
      ]
    },
    ember_handlebars: {
      options: {
        processName: function(fileName) {
          var arr = fileName.split("."),
          path = arr[arr.length - 2].split("/"),
          name = path[path.length - 1],
          isComponents = path.indexOf('components') > -1;
          
          if(isComponents) {
            return 'components/' + name;
          } else {
            return name;
          }
        }
      },
      all: {
        files: {
          'build/templates.js': '<%= template_files %>'
        }
      }
    },
    bower_concat: {
      all: {
        dest: 'build/lib.js',
        cssDest: 'build/lib.css'
      }
    },
    'string-replace': {
      web_adapter_host: {
        files: {
          'build/app/' : 'build/app/**' 
        },
        options: {
          replacements: [{
            pattern: /WEB_ADAPTER_HOST/g,
            replacement: process.env['ASHEVILLE_WEB_ADAPTER_HOST']
          }]
        } 
      },
      prod_web_adapter_host: {
        files: {
          'build/app/' : 'build/app/**' 
        },
        options: {
          replacements: [{
            pattern: /WEB_ADAPTER_HOST/g,
            replacement: process.env['ASHEVILLE_WEB_DEPLOY_ADAPTER_HOST']
          }]
        }
      },
      env_vars: {
        files: {
          'build/' : '<%= app_source_files %>' 
        },
        options: {
          replacements: [{
            pattern: /env\.(\w+)/g,
            replacement: function (match, p1) {
              var value = process.env[p1];

              if (!value) {
                return null;
              } else if (['true', 'false', 'null'].indexOf(value) != -1) {
                return value;
              } else {
                return "'" + value + "'";
              }
            }
          }]
        }
      }
    },
    concat: {
      dev: {
        src: '<%= app_build_files %>',
        dest: 'public/app.js'
      }
    },
    uglify: {
      prod: {
        src: '<%= app_build_files %>',
        dest: 'public/app.js'
      }
    },
    copy: {
      index: {
        files: [{
          src: '<%= index_file %>',
          dest: 'public/index.html'
        }]
      },
      images: {
        files: [{
          expand: true,
          cwd: '<%= images_dir %>',
          src: ['**'],
          dest: 'public/images/'
        }]
      }
    },
    less: {
      dev: {
        files: {
          'build/app.css': [
            '<%= style_source_files %>',
            '<%= style_build_files %>'
          ]
        },
        options: {
          cleancss: false
        }
      },
      prod: {
        files: {
          'build/app.css': [
            '<%= style_source_files %>',
            '<%= style_build_files %>'
          ]
        },
        options: {
          cleancss: true,
          compress: true,
          strictImports: true,
          strictMath: true,
          strictUnits: true
        }
      }
    },
    autoprefixer: {
      all: {
        src: 'build/app.css',
        dest: 'public/app.css'
      }
    },
    express: {
      main: {
        options: {
          script: 'app.js'
        }
      }
    },
    watch: {
      options: {
        debounceDelay: 100
      },
      dev: {
        files: '<%= watch_files %>',
        tasks: ['dev-build']
      },
      prod: {
        files: '<%= watch_files %>',
        tasks: ['prod-build']
      }
    },
    rsync: {
      options: {
        dest: process.env.ASHEVILLE_WEB_DEPLOY_HOST_DIR,
        host: process.env.ASHEVILLE_WEB_DEPLOY_HOST_USERNAME + '@' + process.env.ASHEVILLE_WEB_DEPLOY_HOST
      },
      app: {
        options: {
          src: ['app.js', 'package.json']
        }
      },
      main: {
        options: { 
          recursive: true,
          src: './public'
        }
      }
    },
    sshexec: {
      options: {
        host: process.env.ASHEVILLE_WEB_DEPLOY_HOST,
        port: 22,
        username: process.env.ASHEVILLE_WEB_DEPLOY_HOST_USERNAME,
        agent: process.env.SSH_AUTH_SOCK
      },
      npmInstall: {
        command: 'cd ' + process.env.ASHEVILLE_WEB_DEPLOY_HOST_DIR + ' && npm install --production'
      },
      foreverRestartAll: {
        command: 'cd ' + process.env.ASHEVILLE_WEB_DEPLOY_HOST_DIR + ' && forever restart app.js'
      }
    }
  });

  require('load-grunt-tasks')(grunt)

  // Build app for development
  grunt.registerTask('dev-build', [
    'clean:pre',
    'bower_concat',
    'ember_handlebars',
    'string-replace:env_vars',
    'string-replace:web_adapter_host',
    'concat:dev',
    'less:dev',
    'autoprefixer',
    'copy',
    'clean:post'
  ]);

  // Build app and run local web server for development
  grunt.registerTask('dev', [
    'dev-build', 
    'express',
    'watch:dev'
  ]);

  // Build app for production
  grunt.registerTask('prod-build', [
    'clean:pre', 
    'bower_concat',
    'ember_handlebars',
    'string-replace:env_vars',
    'string-replace:prod_web_adapter_host',
    'uglify:prod',
    'less:prod',
    'autoprefixer',
    'copy',
    'clean:post'
  ]);

  // Build app and run local web server for production
  grunt.registerTask('prod', [
    'prod-build',
    'express',
    'watch:prod'
  ]);

  // Deploy production build
  grunt.registerTask('deploy', [
    'prod-build',
    'rsync',
    'sshexec'
  ]);
};