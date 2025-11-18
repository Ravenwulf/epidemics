// render_graph.js
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// --- 1. Get filename from command line ---
if (process.argv.length < 3) {
  console.error("Usage: node render_contact_network.js <graph.json>");
  process.exit(1);
}

const inputPath = process.argv[2];

if (!fs.existsSync(inputPath)) {
  console.error("File not found:", inputPath);
  process.exit(1);
}

const { elements, params } = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// --- 2. Create output PNG path ---
const base = path.basename(inputPath, '.json');
const outDir = path.join(path.dirname(inputPath), 'pngs');

// ensure ./graphs/pngs exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outputPath = path.join(outDir, `${base}.png`);

// --- 3. Render with Puppeteer ---
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({ width: 2400, height: 2400 });

  await page.setContent(`
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; overflow: hidden; }
        #cy { width: 2400px; height: 2400px; }
        #info {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 4px 6px;
          background: rgba(255,255,255,0.8);
          font-family: sans-serif;
          font-size: 12px;
          border-radius: 4px;
        }
      </style>
      <script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
    </head>
    <body>
      <div id="cy"></div>
      <div id="info"></div>
    </body>
    </html>
  `);

  // Inject elements, layout, styling
  await page.evaluate((elements, params) => {
    const cy = cytoscape({
      container: document.getElementById('cy'),
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#00e5ff',   // bright cyan
            'width': 8,
            'height': 8,
            'opacity': 1
          }
        },
        {
          selector: 'edge',
          style: {
            'line-color': 'rgba(255,255,255,0.35)',  // bright white, semi-transparent
            'width': 1.2,
            'opacity': 0.8
          }
        }
      ],
      layout: {
        name: 'circle',     // you can change this!
        animate: false
      }
    });

    // Overlay graph parameters
    const info = document.getElementById('info');
    info.textContent = `N=${params.N}, k=${params.k}, c=${params.c}`;
    window.cy = cy;
  }, elements, params);

  await new Promise(r => setTimeout(r, 300));  // let Cytoscape render

  await page.screenshot({ path: outputPath });
  await browser.close();

  console.log("Saved PNG →", outputPath);
})();
