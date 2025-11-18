// batch_render.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// --- 1. Get directory from CLI (default: ./graphs) ---
const dir = process.argv[2] || path.join(__dirname, 'graphs');

if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error('Not a directory:', dir);
  process.exit(1);
}

const files = fs.readdirSync(dir)
  .filter(f => f.toLowerCase().endsWith('.json'))
  .map(f => path.join(dir, f));

if (files.length === 0) {
  console.log('No .json files found in', dir);
  process.exit(0);
}

console.log(`Found ${files.length} JSON graph file(s) in ${dir}`);
console.log('Rendering...\n');

// --- 2. Render each file by calling render_contact_network.js ---
function renderFile(idx) {
  if (idx >= files.length) {
    console.log('\nAll renders done.');
    return;
  }

  const file = files[idx];
  console.log(`(${idx + 1}/${files.length}) Rendering: ${file}`);

  const child = spawn('node', [path.join(__dirname, 'render_contact_network.js'), file], {
    stdio: 'inherit'
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`render_contact_network.js exited with code ${code} for file ${file}`);
    }
    // move on to next file
    renderFile(idx + 1);
  });
}

// start the chain
renderFile(0);
