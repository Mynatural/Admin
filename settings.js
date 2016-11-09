const fs = require('fs');
const _ = require('lodash');

const srcFile = './src/settings.json';
const dstFile = './www/settings.json';

if (fs.existsSync(dstFile)) return;

const src = require(srcFile);
console.log("Settings SRC: " + JSON.stringify(src, null, 4));

const dst = _.mapValues(src, (line) => {
    const cmd = _.template(line);
    return cmd(process.env);
});

console.log("Settings DST: " + JSON.stringify(dst, null, 4));
if (!fs.existsSync('./www')) {
    fs.mkdirSync('./www');
}
fs.writeFileSync(dstFile, JSON.stringify(dst));
