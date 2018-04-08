"use strict";
const gulp = require('gulp');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const merge = require('merge2');

const tsProject = ts.createProject('./src/lib/tsconfig.json', {
    declaration: true
});


gulp.task('build', ()=>{
    const result = gulp.src('./src/lib/**/*.ts')
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        //.pipe(sourcemaps.write());
    return merge([
        result.dts.pipe(gulp.dest('./dist/lib')),
        result.js.pipe(sourcemaps.write()).pipe(gulp.dest('./dist/lib'))
    ]);  
});

gulp.task('watch', ['build'], ()=>{
    gulp.watch('./src/lib/**/*.ts', ['build']);
});