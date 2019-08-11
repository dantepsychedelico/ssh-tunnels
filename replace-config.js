'use strict';
const fs = require('fs');

(async function main() {
  let filename = process.argv[2];
  let content = JSON.parse(fs.readFileSync(filename, 'utf-8'));
  for (let key in content) {
    if (key in process.env) {
      content[key] = process.env[key];
    }
  }
  fs.writeFileSync('config.json', JSON.stringify(content, null, 2));
})()
