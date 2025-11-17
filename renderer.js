// renderer.js
const fs = require('fs');
const puppeteer = require('puppeteer');
const gifshot = require('gifshot');

const WIDTH = 800;
const HEIGHT = 600;

async function initPage(elements) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setContent(`
    <html>
      <head>
        <script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
      </head>
      <body>
        <div id="cy" style="width:${WIDTH}px;height:${HEIGHT}px;"></div>
      </body>
    </html>
  `);

  await page.evaluate((elements, WIDTH, HEIGHT) => {
    window.cy = cytoscape({
      container: document.getElementById('cy'),
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': '',
            'width': 6,
            'height': 6,
            'border-width': 0
          }
        },
        {
          selector: 'edge',
          style: {
            'line-color': '#aaaaaa',
            'width': 1
          }
        },
        { selector: 'node[state = "S"]', style: { 'background-color': '#bdc3c7' } },
        { selector: 'node[state = "I"]', style: { 'background-color': '#e74c3c' } },
        { selector: 'node[state = "R"]', style: { 'background-color': '#2ecc71' } }
      ],
      layout: { name: 'preset' }
    });
  }, elements, WIDTH, HEIGHT);

  return { browser, page };
}

async function renderState(page, stateMap) {
  const pngBase64 = await page.evaluate((stateMap) => {
    const cy = window.cy;
    cy.batch(() => {
      cy.nodes().each(n => n.data('state', stateMap[n.id()] || 'S'));
    });
    cy.style().update();
    return cy.png({ output: 'base64', full: true });
  }, stateMap);

  return pngBase64.replace(/^data:image\/png;base64,/, '');
}

async function exportGraphAsPng(elements, stateMap, filename) {
  const { browser, page } = await initPage(elements);
  await new Promise(res => setTimeout(res, 200));

  const base64 = await renderState(page, stateMap);
  fs.writeFileSync(filename, Buffer.from(base64, 'base64'));

  await browser.close();
  console.log(`Saved PNG: ${filename}`);
}

// ---- GIF creator with gifshot ----
async function exportAnimationGif(elements, timeSeries, filename, frameStep = 5, delay = 0.08) {
  const { browser, page } = await initPage(elements);
  await new Promise(res => setTimeout(res, 200));

  const frames = [];
  for (let i = 0; i < timeSeries.length; i += frameStep) {
    const b64 = await renderState(page, timeSeries[i].stateMap);
    frames.push("data:image/png;base64," + b64);
  }

  await browser.close();

  console.log("Encoding GIF… this may take a few seconds…");

  const result = await new Promise(resolve => {
    gifshot.createGIF(
      {
        images: frames,
        gifWidth: WIDTH,
        gifHeight: HEIGHT,
        frameDuration: delay,
      },
      resolve
    );
  });

  if (!result.error) {
    const base64 = result.image.replace(/^data:image\/gif;base64,/, '');
    fs.writeFileSync(filename, Buffer.from(base64, 'base64'));
    console.log(`Saved GIF: ${filename}`);
  } else {
    console.error("GIF encoding failed:", result.errorMsg);
  }
}

module.exports = {
  exportGraphAsPng,
  exportAnimationGif
};

// async function exportGraphAsPng(elements, filename = 'graph.png') {
//   const browser = await puppeteer.launch({
//     headless: 'new'
//   });

//   const page = await browser.newPage();

//   // Basic HTML container
//   await page.setContent(`
//     <html>
//       <head>
//         <script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
//       </head>
//       <body>
//         <div id="cy" style="width:800px; height:600px;"></div>
//       </body>
//     </html>
//   `);

//   // Inject graph + layout
//   await page.evaluate((elements) => {
//     window.cy = cytoscape({
//       container: document.getElementById('cy'),
//       elements,
//       style: [
//         { selector: 'node', style: {
//             'background-color': 'steelblue',
//             'label': 'data(id)',
//             'font-size': 8,
//             'color': '#222'
//         }},
//         { selector: 'edge', style: {
//             'line-color': '#aaa',
//             'width': 1.5
//         }},
//       ],
//       layout: { name: 'cose' }
//     });
//   }, elements);

//   // Allow rendering to complete
//   await new Promise(resolve => setTimeout(resolve, 300));

//   // Extract PNG
//   const pngBase64 = await page.evaluate(() => window.cy.png());
//   const buffer = Buffer.from(pngBase64.split(',')[1], 'base64');

//   fs.writeFileSync(filename, buffer);

//   await browser.close();
//   console.log(`Saved ${filename}`);
// }

// module.exports = {
//   exportGraphAsPng
// };
