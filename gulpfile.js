var gulp = require('gulp'),
    fs = require('fs'),
    _ = require('lodash');

gulp.task('settings', (cb) => {
    const target = './www/settings.json';
    const src = require(target);
    console.log("Settings SRC: " + JSON.stringify(src, null, 4));
    const dst = _.mapValues(src, (line) => {
        const cmd = _.template(line);
        return cmd(process.env);
    });
    console.log("Settings DST: " + JSON.stringify(dst, null, 4));
    fs.writeFile(target, JSON.stringify(dst), cb);
});
