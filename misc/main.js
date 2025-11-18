const cytoscape = require('cytoscape');
const fs = require('fs');

function wattsStrogatz(N, k, c) {
    const nodes = [];
    const edges = [];

    // generate N node objects with unique id's and push them to an array
    for(let i = 0; i < N; i++) {
        nodes.push({ data: { id: "" + i } });
    }

    // k must be even: k neighbors on each side -> k = 2*m
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

// create cytoscape instance of our wattsStrogatz ring world contact network
function createSmallWorldCy(N, k, c) {
    const elements = wattsStrogatz(N, k, c);

    const cy = cytoscape({
        headless: true,
        elements: elements
    });

    return cy;
}

// SIRS Model:
// 0 = S (susceptible)
// 1 = I (infected)
// 2 = R (removed)

// S -> I prob based on infected neighbors
// I -> R recovery rate gamma
// R -> S immunity loss rate omega

function runSIRS(cy, params) {
    const { beta, gamma, omega, steps } = params;

    // initialize SIRS model on contact network with all nodes starting as susceptible
    const state = {};
    cy.nodes().forEach(n => (state[n.id()] = 0));

    // infect a random starting node
    const seed = cy.nodes()[0].id();
    state[seed] = 1;

    const timeSeries = [];

    for (let t = 0; t < steps; t++) {
        const newState = { ...state };
        cy.nodes().forEach(node => {
            const id = node.id();
            const s = state[id];

            if (s === 0) {
                // S -> I depends on infected neighbors
                const infectedNeighbors = node.neighborhood('node')
                    .filter(n => state[n.id()] === 1).length;

                const pInfection = 1 - Math.pow(1 - beta, infectedNeighbors);
                if(Math.random() < pInfection) newState[id] = 1;
    
            } else if (s === 1) {
                // I -> R
                if (Math.random() < gamma) newState[id] = 2;
            } else if (s === 2) {
                // R -> S
                if (Math.random() < omega) newState[id] = 0;
            }
        });

        // Update states
        Object.assign(state, newState);

        // Record
        const S = Object.values(state).filter(x => x === 0).length;
        const I = Object.values(state).filter(x => x === 1).length;
        const R = Object.values(state).filter(x => x === 2).length;

        timeSeries.push({ t, S, I, R });
    }
    
    return timeSeries;
}

const smallWorld = createSmallWorldCy(500, 20, 0.05);
const results = runSIRS(smallWorld, {
    beta: 0.03,
    gamma: 0.1,
    omega: 0.01,
    steps: 2000
});

console.log(results)