const cytoscape = require('cytoscape');
const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Load a basic HTML page with a container + Cytoscape.js
  await page.setContent(`
    <html>
      <body>
        <div id="cy" style="width:800px;height:600px;"></div>
        <script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
      </body>
    </html>
  `);

  // Create the Cytoscape instance inside the browser context
  await page.evaluate(() => {
    window.cy = cytoscape({
      container: document.getElementById('cy'),
      elements: [
        { data: { id: 'a' } },
        { data: { id: 'b' } },
        { data: { id: 'ab', source: 'a', target: 'b' } }
      ],
      style: [
        { selector: 'node', style: { 'background-color': 'blue', 'label': 'data(id)' } },
        { selector: 'edge', style: { 'width': 3 } }
      ],
      layout: { name: 'grid' }
    });
  });

  // Replace waitForTimeout — use a simple delay
  await new Promise(resolve => setTimeout(resolve, 200));

  // Get PNG from Cytoscape
  const pngBase64 = await page.evaluate(() => window.cy.png());

  // Save PNG to file
  fs.writeFileSync('graph.png', Buffer.from(pngBase64.split(',')[1], 'base64'));

  await browser.close();
  console.log("Saved graph.png");
})();
