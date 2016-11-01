const fs = require('fs');
const _ = require('lodash');

const src = require('./src/settings.json');
console.log("Settings SRC: " + JSON.stringify(src, null, 4));

const dst = _.mapValues(src, (line) => {
    const cmd = _.template(line);
    return cmd(process.env);
});

console.log("Settings DST: " + JSON.stringify(dst, null, 4));
fs.writeFileSync('./www/settings.json', JSON.stringify(dst));
