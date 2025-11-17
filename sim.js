// generator for Watts-Strogatz ring world contact networks
function wattsStrogatz(N, k, c) {
    const nodes = [];
    const edges = [];

    // generate N node objects with unique id's and push them to an array
    for(let i = 0; i < N; i++) {
        nodes.push({ data: { id: "" + i } });
    }

    // k must be even: k neighbors on each side -> k = 2*m
    if (k % 2 !== 0) {
        throw new Error("k must be even (it is 2*m neighbors in WS model)");
    }
    const m = k / 2

    // loop through the nodes in the ring and for each of its k neighbors, create an edge
    for (let i = 0; i < N; i++) {
        for (let j = 1; j <= m; j++) {
            const src = i;
            const dest = (i + j) % N;

            // with prob c, rewire an edge to point randomly instead of to an intended neighbor else point to intended neighbor
            if (Math.random() < c) {
                const rand = Math.floor(Math.random() * N);
                edges.push({ data: { source: "" + i, target: "" + rand } });
            } else {
                edges.push({ data: { source: "" + src, target: "" + dest } });
            }
        }
    }

    return nodes.concat(edges);
}

function buildExperiment(config) {
  const { N, k, c } = config;
  const elements = wattsStrogatz(N, k, c);

  return {
    elements
  };
}

module.exports = {
  wattsStrogatz,
  buildExperiment,
};