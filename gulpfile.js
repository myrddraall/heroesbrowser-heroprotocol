"use strict";
const gulp = require('gulp');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');

const tsProject = ts.createProject('./src/lib/tsconfig.json', {
    declaration: true
});


gulp.task('build', ()=>{
    gulp.src('./src/lib/**/*.ts')
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/lib'));
});

gulp.task('watch', ['build'], ()=>{
    gulp.watch('./src/lib/*.ts', ['build']);
});