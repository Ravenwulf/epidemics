const cytoscape = require('cytoscape');
const fs = require('fs');

// ---------- Watts–Strogatz generator ----------
function wattsStrogatz(N, k, c) {
  const nodes = [];
  const edges = [];

  for (let i = 0; i < N; i++) {
    nodes.push({ data: { id: String(i) } });
  }

  const m = k / 2; // k must be even

  for (let i = 0; i < N; i++) {
    for (let j = 1; j <= m; j++) {
      const src = i;
      const to = (i + j) % N;

      if (Math.random() < c) {
        // rewire edge endpoint
        const rand = Math.floor(Math.random() * N);
        edges.push({ data: { source: String(src), target: String(rand) } });
      } else {
        edges.push({ data: { source: String(src), target: String(to) } });
      }
    }
  }

  return nodes.concat(edges);
}

function createSmallWorldCy(N, k, c) {
  return cytoscape({
    headless: true,
    elements: wattsStrogatz(N, k, c)
  });
}

// ---------- SIRS dynamics ----------
function runSIRS(cy, params) {
  const { beta, gamma, omega, steps } = params;

  const state = {};
  cy.nodes().forEach(n => (state[n.id()] = 0)); // 0=S, 1=I, 2=R

  // seed a few initial infections
  cy.nodes().slice(0, 5).forEach(n => (state[n.id()] = 1));

  const series = [];

  for (let t = 0; t < steps; t++) {
    const next = { ...state };

    cy.nodes().forEach(node => {
      const id = node.id();
      const s = state[id];

      if (s === 0) {
        // S -> I, depends on infected neighbors
        const infectedNeighbors = node
          .neighborhood('node')
          .filter(n => state[n.id()] === 1).length;

        const pInfect = 1 - Math.pow(1 - beta, infectedNeighbors);
        if (Math.random() < pInfect) next[id] = 1;

      } else if (s === 1) {
        // I -> R
        if (Math.random() < gamma) next[id] = 2;

      } else if (s === 2) {
        // R -> S
        if (Math.random() < omega) next[id] = 0;
      }
    });

    Object.assign(state, next);

    const I = Object.values(state).filter(x => x === 1).length;
    const S = Object.values(state).filter(x => x === 0).length;
    const R = Object.values(state).filter(x => x === 2).length;

    series.push({ t, S, I, R });
  }

  return series;
}

// ---------- Run experiment for 3 different c values ----------
const N = 500;      // number of nodes
const k = 10;       // each node connected to k nearest neighbors (k even)
const cValues = [0.01, 0.2, 0.9];

const beta = 0.03;  // infection rate
const gamma = 0.1;  // recovery rate
const omega = 0.01; // loss of immunity rate
const steps = 1000; // time steps

const traces = [];
let tAxis = null;

cValues.forEach(c => {
  console.log(`Running SIRS for c=${c}...`);
  const cy = createSmallWorldCy(N, k, c);
  const series = runSIRS(cy, { beta, gamma, omega, steps });

  if (!tAxis) tAxis = series.map(p => p.t);
  const infected = series.map(p => p.I);

  traces.push({
    c,
    infected
  });
});

// ---------- Generate HTML with Plotly ----------
const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>SIRS on Small-World Network</title>
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
</head>
<body>
  <div id="plot" style="width:900px;height:600px;"></div>
  <script>
    const t = ${JSON.stringify(tAxis)};

    const traces = ${JSON.stringify(traces)}.map(tr => ({
      x: t,
      y: tr.infected,
      mode: 'lines',
      name: 'c=' + tr.c
    }));

    const layout = {
      title: 'Number of infected nodes over time (SIRS on Watts–Strogatz)',
      xaxis: { title: 'Time step' },
      yaxis: { title: 'Infected nodes' }
    };

    Plotly.newPlot('plot', traces, layout);
  </script>
</body>
</html>`;

fs.writeFileSync('infected_over_time.html', html);
console.log('Wrote infected_over_time.html – open it in your browser to see the plot.');
