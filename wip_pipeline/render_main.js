// main.js
const { buildExperiment } = require('./sim');
const { exportGraphAsPng, exportAnimationGif } = require('./renderer');

// simple CLI: parse --key value pairs
function parseArgs() {
  const argv = process.argv.slice(2);
  const config = {
    N: 300,
    k: 10,
    c: 0.05,
    steps: 2000,
    beta: 0.03,
    gamma: 0.1,
    omega: 0.01,
    initialInfectedFraction: 0.02,
    makeGif: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);

    if (key === 'gif') {
      config.makeGif = true;
      continue;
    }

    const val = argv[i + 1];
    if (val == null) continue;

    if (['N', 'k', 'steps'].includes(key)) {
      config[key] = parseInt(val, 10);
    } else if (['c', 'beta', 'gamma', 'omega', 'initialInfectedFraction'].includes(key)) {
      config[key] = parseFloat(val);
    }
  }

  return config;
}

(async () => {
  const cli = parseArgs();

  console.log('Running experiment with config:', cli);

  const { elements, timeSeries, config } = buildExperiment(cli);

  // final state for PNG
  const lastState = timeSeries[timeSeries.length - 1].stateMap;
  const baseName = `ws_N${config.N}_k${config.k}_c${config.c}`;

  await exportGraphAsPng(elements, lastState, `${baseName}_final.png`);

  if (cli.makeGif) {
    await exportAnimationGif(elements, timeSeries, `${baseName}_sirs.gif`, 5, 80);
  }

  console.log('Done.');
})();
