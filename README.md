# Usage:
- copy files to local directory with node/npm installed
- `npm init -y`
- `npm install`
- modify the parameters in sirs_smallworld_sim.js (may add CLI or config document parameters in a future update)
- build Watts-Strogatz smallworld contact networks and run SIRS simulations `node sirs_smallworld_sim.js`
- render contact networks `node batch_render.js graphs/<sim>` (note: copy the correct subdirectory path to replace "<sim>")

I used **Cytoscape** to assemble Watts-Strogatz ring networks with variable small-world properties in order to simulate SIRS epidemic models and observe the relation between small-world properties and the emergence of synchronized oscillations in infections.

The contact network is assembled according to the Watts-Strogatz model, with `N` vertices arranged in a ring, connected to their "nearest" vertices for some number of steps `k` in each direction. This creates a contact network where nodes on one side of the ring have a lot of coincident edges, but nodes across from each other on the ring are very far apart. We can now control the small-world properties present in the network by independently reconnecting edges of the graph with probability `c` to a random node rather than the intended neighbor.

As we raise the parameter `c`, more and more nodes will have long distance connections across the ring, increasing the "small-worldness" of the network.

## Contact Networks Visualized 
#### `N` = 10,000 nodes
#### `k` = 15 nodes (resolves to 7 in each direction around the ring)
#### Networks, from top to bottom, are built with `c` probabilities 0.001, 0.01, 0.05, and 0.2

<img width="1200" height="1200" alt="ws_graph_c0p001" src="https://github.com/user-attachments/assets/1dba5109-c828-44d9-8cce-a2f921c789f7" />
<img width="1200" height="1200" alt="ws_graph_c0p01" src="https://github.com/user-attachments/assets/c078c4c6-e421-4f53-8a09-cc97b00ef99a" />
<img width="1200" height="1200" alt="ws_graph_c0p05" src="https://github.com/user-attachments/assets/195e637a-c278-4587-aa9c-a264d3c723a4" />
<img width="1200" height="1200" alt="ws_graph_c0p2" src="https://github.com/user-attachments/assets/4318ea13-1f02-4a03-b95c-59b8f22a6cbf" />

Now, after generating these networks, we can test their response to identical epidemics to observe the effect that these small-world properties have on the lifecycle of the disease.

I implemented an SIRS epidemic model with fixed infection and recovery periods (similar to and inspired by the method used in this [Abramson-Kuperman paper](https://www.researchgate.net/publication/12044035_Small_World_Effect_in_an_Epidemiological_Model))

To explain the SIRS epidemic model, it helps to explain the simpler SIR model first. In the SIR epidemic model, nodes have 3 potential states:
- S -> "susceptible", wherein a node is not infected but can be infected by its neighbors.
- I -> "infected", wherein a node spreads the infection to its neighbors for a number of time steps.
- R -> "removed", wherein a previously infected node has reached the end of the infection period and has been conferred immunity from reinfection.

The SIRS model includes an additional recovery period making immunity temporary and allowing previously infected nodes to become infected again after some time. This addition is especially useful when using the epidemic to model actual diseases, since it mimics the sort of immunity->mutation->immunity cycle that real diseases go through.

## SIRS Epidemic Visualized
The simulation I used had the following properties:
- Infection period: 3 steps
- Recovery period: 9 steps
- Infection seed: 0.1 (fraction of nodes that begin the simulation in the infected state at time step 0)
- Total steps simulated: 1000

<img width="905" height="822" alt="simulation_visualization" src="https://github.com/user-attachments/assets/afb88f7a-a191-4592-a7f6-2d8b2b34fefb" />


### Analysis of Results

As can be seen in the above line graph, the same epidemic, when applied to our different contact networks results in wildly different infection patterns depending on our small-world parameter `c`. In the contact networks with lower small-world properties (`c` = 0.001, 0.01), the disease stabilizes within a particular range but the infection rates seem to display little to no oscillations. As we increase `c` up to 0.05, we can start to see notable repeating peaks and valleys but still with a healthy bit of noise and amplitudes barely greater than the previous networks. However, once we get our `c` value up to 0.2 we observe clear synchronistic behavior, with the infection stabilizing into nearly uniform oscillations with slightly varying amplitude. 

Here we can see that small-world network properties have a marked effect on the emergent lifecycle of our SIRS epidemic.
