const fs = require('fs-extra');
fs.removeSync('dist');
fs.copySync('src', 'dist/src');