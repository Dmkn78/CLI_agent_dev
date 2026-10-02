const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'node_modules', '@logicflow', 'core', 'dist');
const target = path.join(root, 'web', 'vendor');
fs.mkdirSync(target, {recursive: true});
fs.copyFileSync(path.join(root,'node_modules/qrcode-generator/dist/qrcode.js'),path.join(target,'qrcode.js'));
for (const [input, output] of [['index.css','logicflow.css']]) {
  fs.copyFileSync(path.join(source, input), path.join(target, output));
}
esbuild.buildSync({entryPoints:[path.join(root,'node_modules/@logicflow/core/es/index.js')],bundle:true,format:'iife',globalName:'Core',minify:true,outfile:path.join(target,'logicflow.js'),legalComments:'linked'});
fs.copyFileSync(path.join(root,'node_modules/@xterm/xterm/css/xterm.css'),path.join(target,'xterm.css'));
esbuild.buildSync({entryPoints:[path.join(root,'desktop/terminal-renderer.cjs')],bundle:true,format:'iife',globalName:'TerminalEngine',minify:true,outfile:path.join(target,'xterm.js'),legalComments:'linked'});
