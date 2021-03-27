'use strict';

const gulp = require('gulp');
const path = require('path');
const sass = require('gulp-sass');
const using = require('gulp-using');

gulp.task('build-stylesheets', function (cb) {
    return gulp.src([path.join("stylesheets", "*.scss")], { base: './stylesheets' })
        .pipe(using())
        .pipe(sass())
        .pipe(gulp.dest("."));
});

gulp.task('watch', function (cb) {
    gulp.watch('stylesheets/**/*.scss', gulp.series(["build-stylesheets"]));
	return cb();
});

gulp.task('build', gulp.series('build-stylesheets'));
gulp.task('build-and-watch', gulp.series('build-stylesheets', 'watch'));