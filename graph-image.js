const cytoscape = require('cytoscape');

const saved = JSON.parse(fstat.readFileSync('graph.json', 'utf8'));
const cy2 = cytoscape(saved);