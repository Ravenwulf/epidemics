// sim.js

// ----- Watts–Strogatz small-world graph with ring positions -----
function wattsStrogatz(N, k, c, width = 800, height = 600, radius = 250) {
  if (k % 2 !== 0) {
    throw new Error("k must be even (k = 2m neighbors in WS model).");
  }

  const nodes = [];
  const edges = [];
  const m = k / 2;

  const cx = width / 2;
  const cy = height / 2;

  // nodes on a ring
  for (let i = 0; i < N; i++) {
    const angle = (2 * Math.PI * i) / N;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    nodes.push({
      data: { id: String(i) },
      position: { x, y }
    });
  }

  // ring lattice + rewiring
  for (let i = 0; i < N; i++) {
    for (let j = 1; j <= m; j++) {
      const src = i;
      const dest = (i + j) % N;

      let target = dest;
      if (Math.random() < c) {
        target = Math.floor(Math.random() * N);
      }

      edges.push({
        data: { source: String(src), target: String(target) }
      });
    }
  }

  return nodes.concat(edges);
}

// ----- Build adjacency list from WS edges -----
function buildAdjacency(elements, N) {
  const adj = Array.from({ length: N }, () => []);
  for (const ele of elements) {
    if (ele.data && ele.data.source != null && ele.data.target != null) {
      const u = Number(ele.data.source);
      const v = Number(ele.data.target);
      if (!Number.isNaN(u) && !Number.isNaN(v)) {
        adj[u].push(v);
        adj[v].push(u); // treat as undirected
      }
    }
  }
  return adj;
}

// ----- SIRS simulation -----
/*
  state codes:
  0 = S (susceptible)
  1 = I (infectious)
  2 = R (recovered / immune)
*/
function runSIRS(adj, params) {
  const {
    N,
    beta = 0.03,        // infection rate
    gamma = 0.1,        // recovery rate
    omega = 0.01,       // loss-of-immunity rate
    steps = 2000,
    initialInfectedFraction = 0.02
  } = params;

  const state = new Array(N).fill(0); // all S

  // seed infections
  const initialInfected = Math.max(1, Math.round(N * initialInfectedFraction));
  for (let i = 0; i < initialInfected; i++) {
    const idx = Math.floor(Math.random() * N);
    state[idx] = 1;
  }

  const timeSeries = []; // array of { t, states: {...}, S, I, R }

  for (let t = 0; t < steps; t++) {
    const newState = state.slice();

    for (let i = 0; i < N; i++) {
      const s = state[i];
      if (s === 0) {
        // S → I
        let infectedNeighbors = 0;
        for (const nb of adj[i]) {
          if (state[nb] === 1) infectedNeighbors++;
        }
        const pInfection = 1 - Math.pow(1 - beta, infectedNeighbors);
        if (Math.random() < pInfection) newState[i] = 1;

      } else if (s === 1) {
        // I → R
        if (Math.random() < gamma) newState[i] = 2;

      } else if (s === 2) {
        // R → S
        if (Math.random() < omega) newState[i] = 0;
      }
    }

    // copy back
    for (let i = 0; i < N; i++) state[i] = newState[i];

    const S = state.filter(x => x === 0).length;
    const I = state.filter(x => x === 1).length;
    const R = state.filter(x => x === 2).length;

    // store state as map id -> "S"/"I"/"R" for rendering
    const stateMap = {};
    for (let i = 0; i < N; i++) {
      stateMap[String(i)] = state[i] === 0 ? 'S' : state[i] === 1 ? 'I' : 'R';
    }

    timeSeries.push({ t, stateMap, S, I, R });
  }

  return timeSeries;
}

// ----- top-level experiment builder -----
function buildExperiment(config) {
  const {
    N = 300,
    k = 10,
    c = 0.05,
    width = 800,
    height = 600,
    radius = 250,
    beta,
    gamma,
    omega,
    steps,
    initialInfectedFraction
  } = config;

  const elements = wattsStrogatz(N, k, c, width, height, radius);
  const adj = buildAdjacency(elements, N);
  const series = runSIRS(adj, {
    N,
    beta,
    gamma,
    omega,
    steps,
    initialInfectedFraction
  });

  return { elements, timeSeries: series, config: { N, k, c, width, height } };
}

module.exports = {
  wattsStrogatz,
  buildExperiment
};
