const { buildExperiment } = require('./sim');
const { exportGraphAsPng } = require('./renderer');

(async () => {
  // Choose your WS parameters:
  const config = {
    N: 200,   // number of nodes
    k: 10,    // must be even, neighbors on each side
    c: 0.05   // rewiring probability
  };

  // Build graph (later: run SIRS here too)
  const { elements } = buildExperiment(config);

  // Export PNG
  const filename = `ws_N${config.N}_k${config.k}_c${config.c}.png`;
  await exportGraphAsPng(elements, filename);
})();
