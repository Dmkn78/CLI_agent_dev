const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
// node-pty ships this helper without its executable bit in some npm archives.
if (process.platform !== 'win32') {
  for (const folder of [`prebuilds/${process.platform}-${process.arch}`, 'build/Release']) {
    const helper = path.join(root, 'node_modules/node-pty', folder, 'spawn-helper');
    if (fs.existsSync(helper)) fs.chmodSync(helper, fs.statSync(helper).mode | 0o111);
  }
}
const source = path.join(root, 'node_modules', '@logicflow', 'core', 'dist');
const target = path.join(root, 'web', 'vendor');
fs.mkdirSync(target, {recursive: true});
for (const [input, output] of [['index.css','logicflow.css']]) {
  fs.copyFileSync(path.join(source, input), path.join(target, output));
}
esbuild.buildSync({entryPoints:[path.join(root,'node_modules/@logicflow/core/es/index.js')],bundle:true,format:'iife',globalName:'Core',minify:true,outfile:path.join(target,'logicflow.js'),legalComments:'linked'});
fs.copyFileSync(path.join(root,'node_modules/@xterm/xterm/css/xterm.css'),path.join(target,'xterm.css'));
esbuild.buildSync({entryPoints:[path.join(root,'desktop/terminal-renderer.cjs')],bundle:true,format:'iife',globalName:'TerminalEngine',minify:true,outfile:path.join(target,'xterm.js'),legalComments:'linked'});
