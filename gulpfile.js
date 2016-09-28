var gulp = require('gulp'),
    gulpTypings = require('gulp-typings'),
    gulpWatch = require('gulp-watch'),
    del = require('del'),
    runSequence = require('run-sequence'),
    argv = process.argv;


/**
 * Ionic hooks
 * Add ':before' or ':after' to any Ionic project command name to run the specified
 * tasks before or after the command.
 */
gulp.task('serve:before', ['watch']);
gulp.task('emulate:before', ['build']);
gulp.task('deploy:before', ['build']);
gulp.task('build:before', ['build']);

// we want to 'watch' when livereloading
var shouldWatch = argv.indexOf('-l') > -1 || argv.indexOf('--livereload') > -1;
gulp.task('run:before', [shouldWatch ? 'watch' : 'build']);

/**
 * Ionic Gulp tasks, for more information on each see
 * https://github.com/driftyco/ionic-gulp-tasks
 *
 * Using these will allow you to stay up to date if the default Ionic 2 build
 * changes, but you are of course welcome (and encouraged) to customize your
 * build however you see fit.
 */
var webpackBuild = require('ionic-gulp-webpack');
var buildSass = require('ionic-gulp-sass-build');
var copyHTML = require('ionic-gulp-html-copy');
var copyFonts = require('ionic-gulp-fonts-copy');
var copyScripts = require('ionic-gulp-scripts-copy');
var tslint = require('ionic-gulp-tslint');
var customIcons = require('ionic2-custom-icons/gulp-plugin');

var isRelease = argv.indexOf('--release') > -1;

gulp.task('watch', ['clean'], function(done){
  runSequence(
    ['sass', 'html', 'fonts', 'scripts'],
    function(){
      gulpWatch('icons/**/*.svg', function(){ gulp.start('sass'); });
      gulpWatch('app/**/*.scss', function(){ gulp.start('sass'); });
      gulpWatch('app/**/*.html', function(){ gulp.start('html'); });
      webpackBuild({ watch: true }).then(done);
    }
  );
});

gulp.task('build', ['clean', 'typings'], function(done){
  runSequence(
    ['sass', 'html', 'fonts', 'scripts'],
    function(){
        webpackBuild().then(done);
    }
  );
});

gulp.task('customIcons', function () {
    return customIcons(['fathens'].map((key) => {
        return {
            src: 'icons/' + key + '/*.svg',
            name: key + '-icons',
            id: key,
            scssTargetRelPath: '../scss/' + key + '-icons.scss'
        };
    }));
});

gulp.task('sass', ['customIcons'], function(){
    var paths = [
        'node_modules/ionic-angular',
        'node_modules/ionicons/dist/scss',
        'node_modules/ionic2-custom-icons/directive/lib/scss/',
        'www/build/scss'
    ];
    return buildSass({
        sassOptions: {
            includePaths: paths.concat(require("bourbon").includePaths)
        }
    });
});
gulp.task('html', copyHTML);
gulp.task('fonts', copyFonts);
gulp.task('scripts', copyScripts);
gulp.task('clean', function(){
  return del('www/build');
});
gulp.task('lint', tslint);

gulp.task('clean-typings', function(){
  return del('typings');
});
gulp.task("typings", ['clean-typings'], function(){
    return gulp.src("./typings.json")
        .pipe(gulpTypings()); //will install all typingsfiles in pipeline.
});
