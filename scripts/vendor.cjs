const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'node_modules', '@logicflow', 'core', 'dist');
const target = path.join(root, 'web', 'vendor');
fs.mkdirSync(target, {recursive: true});
for (const [input, output] of [['index.css','logicflow.css']]) {
  fs.copyFileSync(path.join(source, input), path.join(target, output));
}
esbuild.buildSync({entryPoints:[path.join(root,'node_modules/@logicflow/core/es/index.js')],bundle:true,format:'iife',globalName:'Core',minify:true,outfile:path.join(target,'logicflow.js'),legalComments:'linked'});
