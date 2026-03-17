# TSP Route Analyzer – Cavite

## Overview
This project is a simple web-based route analyzer that shows the shortest path between selected locations in Cavite. The user selects a starting node, an ending node, and a metric to optimize (distance, time, or fuel). The system then calculates and displays the best route on a network map.

## Approach
The program represents different cities as nodes and the connections between them as edges. Each edge contains values for distance, travel time, and fuel consumption.

When the user selects the start and end nodes and clicks the **Find Path** button, the program calculates the best route based on the selected metric.

The map is displayed using SVG elements. Nodes and edges are drawn visually so the user can easily see the route. The program also shows the total distance, time, and fuel used, along with the step-by-step path.

## Algorithm Used
The algorithm used in this project is **Dijkstra’s Algorithm**, which finds the shortest path between two nodes in a graph.

### Steps of the Algorithm
1. Set the distance of the starting node to **0** and all other nodes to **infinity**.
2. Select the node with the smallest distance that has not been visited.
3. Check all neighboring nodes and update their distance if a shorter path is found.
4. Repeat the process until the destination node is reached.
5. Reconstruct the path from the destination back to the start.

This algorithm works well for graphs where edges have weights such as distance, time, or fuel.

## Challenges Faced
One challenge was organizing the graph data so the algorithm could correctly read the connections between nodes.

Another challenge was connecting the algorithm to the visual map so that the correct edges and nodes would highlight when a path is found.

Adjusting the SVG layout and animations also required careful positioning so the map would remain clear and readable.

## Conclusion
Despite these challenges, the system successfully calculates and displays the optimal route between the selected nodes based on the chosen metric.