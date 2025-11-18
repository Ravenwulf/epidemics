const cy = cytoscape({
    elements: [
        { data: { id: 'a', label: 'Node A'}},
        { data: { id: 'b', label: 'Node B'}},
        { data: { id: 'c', label: 'Node C'}},

        { data: { id: 'ab', source: 'a', target: 'b'}},
        { data: { id: 'bc', source: 'b', target: 'c'}}
    ],
    style: [
    {
      selector: 'node',
      style: {
        'label': 'data(label)'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2
      }
    }
  ]
});

cy.layout({ name: 'breadthfirst' }).run();

cy.nodes().forEach(node => {
  console.log(`Node ${node.id()}: degree = ${node.degree()}`);
});

const dijkstra = cy.elements().dijkstra('#a');
const path = dijkstra.pathTo(cy.$('#c'));
console.log('Shortest path a -> c:', path.map(ele => ele.id()));


const json = cy.json();
fs.writeFileSync('graph.json', JSON.stringify(json, null, 2));

// Puppeteer render:

// const cytoscape = require('cytoscape');
// const fs = require('fs');
// const puppeteer = require('puppeteer');

// (async () => {
//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();

//   // Load a basic HTML page with a container + Cytoscape.js
//   await page.setContent(`
//     <html>
//       <body>
//         <div id="cy" style="width:800px;height:600px;"></div>
//         <script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
//       </body>
//     </html>
//   `);

//   // Create the Cytoscape instance inside the browser context
//   await page.evaluate(() => {
//     window.cy = cytoscape({
//       container: document.getElementById('cy'),
//       elements: [
//         { data: { id: 'a' } },
//         { data: { id: 'b' } },
//         { data: { id: 'ab', source: 'a', target: 'b' } }
//       ],
//       style: [
//         { selector: 'node', style: { 'background-color': 'blue', 'label': 'data(id)' } },
//         { selector: 'edge', style: { 'width': 3 } }
//       ],
//       layout: { name: 'grid' }
//     });
//   });

//   // Replace waitForTimeout — use a simple delay
//   await new Promise(resolve => setTimeout(resolve, 200));

//   // Get PNG from Cytoscape
//   const pngBase64 = await page.evaluate(() => window.cy.png());

//   // Save PNG to file
//   fs.writeFileSync('graph.png', Buffer.from(pngBase64.split(',')[1], 'base64'));

//   await browser.close();
//   console.log("Saved graph.png");
// })();
