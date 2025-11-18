const cytoscape = require('cytoscape');
const fs = require('fs');
const path = require('path');

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

// ---------- SIRS model ----------
// function runSIRS(cy, params) {
//   const { beta, gamma, omega, steps, seed } = params;

//   const state = {};
//   cy.nodes().forEach(n => (state[n.id()] = 0)); // 0=S, 1=I, 2=R

//   // seed a few initial infections
//   cy.nodes().slice(0, seed).forEach(n => (state[n.id()] = 1));

//   const series = [];

//   for (let t = 0; t < steps; t++) {
//     const next = { ...state };

//     cy.nodes().forEach(node => {
//       const id = node.id();
//       const s = state[id];

//       if (s === 0) {
//         // S -> I, depends on infected neighbors
//         const infectedNeighbors = node
//           .neighborhood('node')
//           .filter(n => state[n.id()] === 1).length;

//         const p = 1 - Math.pow(1 - beta, infectedNeighbors);
//         if (Math.random() < pInfect) next[id] = 1;

//       } else if (s === 1) {
//         // I -> R
//         if (Math.random() < gamma) next[id] = 2;

//       } else if (s === 2) {
//         // R -> S
//         if (Math.random() < omega) next[id] = 0;
//       }
//     });

//     Object.assign(state, next);

//     const I = Object.values(state).filter(x => x === 1).length;
//     const S = Object.values(state).filter(x => x === 0).length;
//     const R = Object.values(state).filter(x => x === 2).length;

//     series.push({ t, S, I, R });
//   }

//   return series;
// }

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
                const neighbors = node.neighborhood('node');
                const k = neighbors.length;
                const kinf = neighbors.filter(n => state[n.id()] === 1).length;

                // infection probability = (# of infected neighbors) / (# of neighbors) or 0 if no neighbors
                const p = (k === 0 ? 0 : (kinf / k));
                //DEBUG
                // if(t > 20 & t < 30) console.log(`k: ${k}, kinf: ${kinf}, frac: ${p}`);
                //DEBUG

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
        //DEBUG
        if(t%(N/10) == 0) console.log(`Infection at step t = ${t}: ${I}`);
        //DEBUG END
        series.push({ t, S, I, R, SFrac: S / N, IFrac: I / N, RFrac: R / N });
    }
    return series;
}

function exportGraph(cy, params) {
    // Unique filename
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

// ---------- Run experiment for 3 different c values ----------

// time stamp simulation
const stamp = (new Date()).toISOString().replace(/[:.]/g, '-');

// Watts-Strogatz parameters
const N = 500;      // number of nodes
const k = 15;       // each node connected to k nearest neighbors (k even)
const cValues = [0.001, 0.01, 0.05, 0.2, 0.9];

// fixed SIRS parameters
// const Iprob = 0.12;
const Iperiod = 3;
const Rperiod = 9;
const Iseed = 0.1;
const steps = 500; // time steps

const params = { N, k, cValues, Iperiod, Rperiod, Iseed, steps}

// // non-fixed SIRS parameters
// const beta = 0.03;  // infection rate
// const gamma = 0.1;  // recovery rate
// const omega = 0.01; // loss of immunity rate
// const seed = 5;


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

    // Export graph for rendering
    exportGraph(cy, {N, k, c}, stamp);

    // run SIRS epidemic on the contact network
    const series = runSIRSfixed(cy, { Iperiod, Rperiod, steps, Iseed });
//   const series = runSIRS(cy, { beta, gamma, omega, steps, seed });
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
    <pre id="params"></pre>

  <script>
    const params = ${JSON.stringify(params, null, 2)};
    document.getElementById('params').textContent =
      'Simulation parameters:\\n' + JSON.stringify(params, null, 2);
  </script>
</body>
</html>`;

fs.writeFileSync(`plot_simulation_${stamp}.html`, html);
console.log(`Wrote plot_simulation_${stamp}.html – open it in browser to see the plot.`);
