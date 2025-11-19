const cytoscape = require('cytoscape');
const fs = require('fs');
const path = require('path');

// Watts–Strogatz generator 
function wattsStrogatz(N, k, c) {
  const nodes = [];
  const edges = [];

  for (let i = 0; i < N; i++) {
    nodes.push({ data: { id: String(i) } });
  }

  const m = k / 2; // k should be even

  // for each node, create its neighborhood according to the k parameter
  for (let i = 0; i < N; i++) {
    for (let j = 1; j <= m; j++) {
      const src = i;
      const to = (i + j) % N;

      // rewire edge endpoint randomly with probability c to generate long range connections
      if (Math.random() < c) {
        const rand = Math.floor(Math.random() * N);
        edges.push({ data: { source: String(src), target: String(rand) } });
      } else {
        edges.push({ data: { source: String(src), target: String(to) } });
      }
    }
  }

  return nodes.concat(edges);
}

// take Watts-Strogatz parameters and feed the completed network into a cytoscape instance
function createSmallWorldCy(N, k, c) {
  return cytoscape({
    headless: true,
    elements: wattsStrogatz(N, k, c)
  });
}

// simulate SIRS epidemic on the given cytoscape network object with provided SIRS parameters 
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

    // set up the initial t = 0 state of the epidemic
    const initialInfected = Math.max(1, Math.round(Iseed * N));
    const shuffled = nodes.sort(() => Math.random() - 0.5);
    for(let i = 0; i < initialInfected; i++) {
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
                // check infection status of neighbors to determine probability that this node gets infected
                const neighbors = node.neighborhood('node');
                const k = neighbors.length;
                const kinf = neighbors.filter(n => state[n.id()] === 1).length;

                // infection probability = (# of infected neighbors) / (# of neighbors) or 0 if no neighbors
                const p = (k === 0 ? 0 : (kinf / k));

                if (Math.random() < p) {
                  newState[id] = 1; // become infected   
                  newTimer[id] = Iperiod;
                } else {
                  newState[id] = 0; // remain susceptible
                  newTimer[id] = 0;
                }

            // infected
            } else if(s === 1) {
                const remaining = timer[id] - 1;
                if(remaining <= 0) {
                    newState[id] = 2; // become immune
                    newTimer[id] = Rperiod;
                } else {
                    newState[id] = 1; // remain infected
                    newTimer[id] = remaining;
                }
            // immune
            } else if(s === 2) {
                const remaining = timer[id] - 1;
                if(remaining <= 0) {
                    newState[id] = 0; // become susceptible
                    newTimer[id] = 0;
                } else {
                    newState[id] = 2; // remain immune
                    newTimer[id] = remaining;
                }
            }
        });

        // update states for this timestep
        nodes.forEach(n => {
            const id = n.id();
            state[id] = newState[id];
            timer[id] = newTimer[id];
        });

        // record values for simulation results
        let S = 0, I = 0, R = 0;
        nodes.forEach(n => {
            if(state[n.id()] === 0) S++;
            else if(state[n.id()] === 1) I++;
            else R++;
        });
        //DEBUG
        if(t%(N/10) == 0) console.log(`Infection at step t = ${t}: ${I}`);
        //DEBUG END

        // store the results of this timestep
        series.push({ t, S, I, R, SFrac: S / N, IFrac: I / N, RFrac: R / N });
    }
    return series;
}

// export the assembled Watts-Strogatz graph to json for rendering or for further simulations
function exportGraph(cy, params) {
    // unique filename using timestamp
    const filename = `ws_graph_c${String(params.c).replace('.', 'p')}.json`;

    if (!fs.existsSync(`./graphs/sim${stamp}`)) {
        fs.mkdirSync(`./graphs/sim${stamp}`);
    }

    const filepath = path.join('graphs', `sim${stamp}`, filename);

    fs.writeFileSync(filepath, JSON.stringify({
        params: params,
        elements: cy.elements().jsons()
    }, null, 2));

    console.log(`Saved ${filename}`);
}

// PARAMETERS
// time stamp simulation for unique filenames
const stamp = (new Date()).toISOString().replace(/[:.]/g, '-');

// Watts-Strogatz parameters
const N = 10000;    // number of nodes
const k = 15;      // each node connected to k nearest "neighbors" (no relation)
const cValues = [0.001, 0.01, 0.05, 0.2];

// fixed SIRS parameters
const Iperiod = 3; // infection period (measured in time steps)
const Rperiod = 9;// recovery period (measrued in time steps)
const Iseed = 0.1; // fraction of nodes which begin in infected state at timestep t = 0
const steps = 500; // time steps

const params = { N, k, cValues, Iperiod, Rperiod, Iseed, steps}

const traces = [];
let tAxis = null;

// for each cValue set in the parameters, run an SIRS epidemic on the associated Watts-Strogatz contact network
cValues.forEach(c => {
    console.log(`Running SIRS for c=${c}...`);
    const cy = createSmallWorldCy(N, k, c);
    //DEBUG
    const componentCount = cy.elements().components().length;
    console.log("WS component count " + componentCount);
    if(componentCount != 1) return;
    //DEBUG END

    // export graph for rendering
    exportGraph(cy, {N, k, c}, stamp);

    // run SIRS epidemic on the contact network
    const series = runSIRSfixed(cy, { Iperiod, Rperiod, steps, Iseed });

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
    <pre id="params"></pre>

  <script>
    const params = ${JSON.stringify(params, null, 2)};
    document.getElementById('params').textContent =
      'Simulation parameters:\\n' + JSON.stringify(params, null, 2);
  </script>
</body>
</html>`;

if (!fs.existsSync(`./graphs/sim${stamp}`)) {
  fs.mkdirSync(`./graphs/sim${stamp}`);
}
fs.writeFileSync(path.join('graphs', `sim${stamp}`, `plot_simulation_${stamp}.html`), html);
console.log(`generated plot_simulation_${stamp}.html – open it in browser to see the plot.`);
