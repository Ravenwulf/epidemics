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