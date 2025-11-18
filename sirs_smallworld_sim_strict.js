const cytoscape = require('cytoscape');
const fs = require('fs');


// ---------- Watts–Strogatz generator ----------
function wattsStrogatz(N, k, c) {
  const nodes = [];
  const edges = [];
  const adj = Array.from({ length: N }, () => new Set());

  const m = k / 2; // k must be even
  for (let i = 0; i < N; i++) {
    for (let j = 1; j <= m; j++) {
      const u = i;
      const v = (i + j) % N;

      // add edge both ways
      adj[u].add(v);
      adj[v].add(u);
    }
  }

  for (let u = 0; u < N; u++) {
    for (let j = 1; j <= m; j++) {
      const v = (u + j) % N;

      if (Math.random() < c) {
        // remove existing edge u–v
        adj[u].delete(v);
        adj[v].delete(u);

        let w;
        do {
          w = Math.floor(Math.random() * N);
        } while (
          w === u ||          // no self-loop
          adj[u].has(w)       // no duplicate
        );

        // add new edge u–w
        adj[u].add(w);
        adj[w].add(u);
      }
    }
  }
  
  for (let i = 0; i < N; i++) {
    nodes.push({ data: { id: "" + i } });
    for (const j of adj[i]) {
      if (i < j) {
        edges.push({ data: { source: "" + i, target: "" + j } });
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

function runSIRSfixed(cy, params) {
    const { Iperiod, Rperiod, steps, Iseed } = params;

    const nodes = cy.nodes();
    const N = nodes.length;

    // state[id] is either 0 -> S, 1 -> I or 2 -> R, timer[id] is an integer
    const state = {};
    const timer = {};

    nodes.forEach(n => {
        state[n.id()] = 0;
        timer[n.id()] = 0;
    });

    const initialInfected = Math.max(1, Math.round(Iseed * N));
    const shuffled = nodes.sort(() => Math.random() - 0.5);
    for(let i = 0; i < Iseed; i++) {
        const id = shuffled[i].id();
        state[id] = 1;
        timer[id] = Iperiod;
    }

    const series = [];

    for (let t = 0; t < steps; t++) {
        const newState = {};
        const newTimer = {};

        nodes.forEach(node => {
            const id = node.id();
            const s = state[id];

            // susceptible
            if(s === 0) {
                const neighbors = node.neighborhood('node').filter(n => state[n.id()] === 1)
                const k = neighbors.length;
                const kinf = neighbors.filter(n => state[n.id()] === 1).length;

                // infection probability = (# of infected neighbors) / (# of neighbors) or 0 if no neighbors
                const p = k === 0 ? 0 : kinf / k;

                if (Math.random() < p) {
                 newState[id] = 1; //infected   
                 newTimer[id] = Iperiod;
                } else {
                    newState[id] = 0;
                    newTimer[id] = 0;
                }

            // infected
            } else if(s === 1) {
                const remaining = timer[id] - 1;
                if(remaining <= 0) {
                    newState[id] = 2; // immune
                    newTimer[id] = Rperiod;
                } else {
                    newState[id] = 1; // infected
                    newTimer[id] = remaining;
                }
            // immune
            } else if(s === 2) {
                const remaining = timer[id] - 1;
                if(remaining <= 0) {
                    newState[id] = 0; // susceptible
                    newTimer[id] = 0;
                } else {
                    newState[id] = 2; // immune
                    newTimer[id] = remaining;
                }
            }
        });

        nodes.forEach(n => {
            const id = n.id();
            state[id] = newState[id];
            timer[id] = newTimer[id];
        });

        // record values
        let S = 0, I = 0, R = 0;
        nodes.forEach(n => {
            if(state[n.id()] === 0) S++;
            else if(state[n.id()] === 1) I++;
            else R++;
        });

        series.push({ t, S, I, R, SFrac: S / N, IFrac: I / N, RFrac: R / N });
    }
    return series;
}

// ---------- Run experiment for 3 different c values ----------
const N = 6000;      // number of nodes
const k = 15;       // each node connected to k nearest neighbors (k even)
const cValues = [0.8];
const steps = 500; // time steps

// fixed SIRS parameters
// const Iprob = 0.12;
const Iperiod = 3;
const Rperiod = 9;
const Iseed = 0.1;

const traces = [];
let tAxis = null;

cValues.forEach(c => {
  console.log(`Running SIRS for c=${c}...`);
  const cy = createSmallWorldCy(N, k, c);

  //DEBUG
  const componentCount = cy.elements().components().length;
  console.log("WS component count " + componentCount);
  if(componentCount != 1) return;
  //DEBUG END

  const series = runSIRSfixed(cy, { Iperiod, Rperiod, steps, Iseed });
//   console.log(series.slice(5000, 5600).map(p => p.IFrac));

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
console.log('Wrote infected_over_time.html – open it in browser to see the plot.');
