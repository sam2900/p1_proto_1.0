// const d3 = require('d3');
// import * as d3 from 'd3';

const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
setCanvasSize();
window.addEventListener('resize', setCanvasSize);

// Create stars
const stars = [];
const starCount = 400; // More stars for fuller coverage

// Create a star with depth for parallax effect
function createStar() {
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 1.5 + 0.5, // Star depth affects size and speed
        brightness: Math.random() * 0.5 + 0.6,
        // twinkleSpeed: Math.random() * 0.01 + 0.003,
        twinkleSpeed: Math.random() * 0.01 + 0.123,
        twinklePhase: Math.random() * Math.PI * 2,
        moveX: (Math.random() - 0.5) * 0.6, // Very slow horizontal movement
        moveY: (Math.random() - 0.5) * 0.6  // Very slow vertical movement
    };
}

// Initialize stars
for (let i = 0; i < starCount; i++) {
    stars.push(createStar());
}

// Animation
function animate() {
    // Clear canvas with more opacity for less trail
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw stars
    stars.forEach(star => {
        // Update position (infinite wrapping movement)
        star.x += star.moveX * star.z;
        star.y += star.moveY * star.z;

        // Wrap around screen edges
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;

        // Twinkling effect
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        const brightness = star.brightness * twinkle;

        // Draw star with size based on depth
        const radius = star.z * 1.2;

        // Create a gradient for each star for a more natural glow
        const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, radius * 2
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(star.x, star.y, radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    });

    requestAnimationFrame(animate);
}

animate();








//background
// Enhanced color palette for clusters
const clusterColors = [
    '#FF1E1E', '#FFB200', '#EB5B00', '#D91656',
    '#640D5F', '#FF8F00', '#FFDB00', '#4169E1',
    '#EE66A6', '#00FF00'
];

let nextColorIndex = 0;

// Initial data structure - now empty as there's no root node
let data = {
    nodes: [],
    links: []
};

const width = window.innerWidth - 200;
const height = window.innerHeight;

const svg = d3.select("#graph")
    .attr("width", width)
    .attr("height", height);

// Enhanced force simulation
const simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id)
        .distance(d => {
            // Increase distance based on number of siblings
            if (d.source.type !== "cluster") {
                const siblingCount = getSiblingCount(d.source);
                return Math.max(100, 60 + siblingCount * 15);
            }
            return 60;
        })
        .strength(0.5))
    .force("charge", d3.forceManyBody()
        .strength(d => d.type === "cluster" ? -500 : -100))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => {
        // Increase collision radius for clusters based on number of children
        if (d.type === "cluster") {
            const childCount = getClusterLeafCount(d.id);
            return Math.max(50, 30 + childCount * 10);
        }
        return 20;
    }))
    .force("x", d3.forceX(width / 2).strength(0.05))
    .force("y", d3.forceY(height / 2).strength(0.05));


function circularLayoutForce(alpha) {
    const clusters = data.nodes.filter(n => n.type === "cluster");

    clusters.forEach(cluster => {
        const children = data.nodes.filter(n =>
            n.type !== "cluster" &&
            data.links.some(l => l.target.id === cluster.id && l.source.id === n.id)
        );

        if (children.length > 0) {
            const radius = Math.max(80, children.length * 20);
            const angleStep = (2 * Math.PI) / children.length;

            children.forEach((child, i) => {
                const angle = i * angleStep;
                const targetX = cluster.x + radius * Math.cos(angle);
                const targetY = cluster.y + radius * Math.sin(angle);

                // Apply force towards the target position
                child.vx = (targetX - child.x) * alpha * 0.3;
                child.vy = (targetY - child.y) * alpha * 0.3;

                // Add slight repulsion between siblings
                children.forEach((sibling, j) => {
                    if (i !== j) {
                        const dx = child.x - sibling.x;
                        const dy = child.y - sibling.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < radius / 2) {
                            child.vx += dx * alpha * 0.1;
                            child.vy += dy * alpha * 0.1;
                        }
                    }
                });
            });
        }
    });
}

// Add the circular layout force to the simulation
simulation.force("circular", circularLayoutForce);


let link = svg.append("g").selectAll("line");
let node = svg.append("g").selectAll("g");


function getClusterLeafCount(clusterId) {
    return data.nodes.filter(n =>
        n.type === "task" && data.links.some(l =>
            l.source.id === n.id && l.target.id === clusterId
        )
    ).length;
}

function getNodeRadius(d) {
    if (d.type === "cluster") {
        const childCount = getClusterLeafCount(d.id);
        // Start with a smaller base size, increase slightly with more children
        return Math.min(25, 15 + childCount * 0.5);
    }
    // Child nodes start larger and decrease with siblings
    const siblingCount = getSiblingCount(d);
    return Math.max(8, 12 - siblingCount * 0.3);
}

function getSiblingCount(node) {
    if (node.type === "cluster") return 0;

    const parentLink = data.links.find(l => l.source.id === node.id);
    if (!parentLink) return 0;

    return data.links.filter(l =>
        l.target.id === parentLink.target.id &&
        l.source.id !== node.id
    ).length;
}

function getNodeColor(d) {
    return d.color || '#4169E1';
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
    const width = window.innerWidth;
    d3.select("#graph").attr("width", width);
    simulation.force("center", d3.forceCenter(width / 2, height / 2));
    simulation.alpha(0.3).restart();
}

let selectedNodeForDelete = null;
let selectedNodeForEdit = null;
let selectedSourceNode = null;
let selectedTargetNode = null;

function updateGraph() {
    // Update links
    link = link.data(data.links, d => `${d.source.id}-${d.target.id}`);
    link.exit().remove();
    const linkEnter = link.enter().append("line")
        .attr("class", d => `link ${d.type === 'connection' ? 'connection' : ''}`);
    link = linkEnter.merge(link);

    // Update nodes with proper data binding
    node = node.data(data.nodes, d => d.id);
    node.exit().remove();

    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .on("click", handleNodeClick);

    nodeEnter.append("circle")
        .attr("r", getNodeRadius);

    nodeEnter.append("text")
        .attr("dy", ".35em")
        .attr("x", d => d.type === "cluster" ? 25 : 15);

    node = nodeEnter.merge(node);

    // Update existing nodes
    node.select("circle")
        .attr("r", getNodeRadius)
        .style("fill", getNodeColor);

    node.select("text")
        .text(d => d.name);  // Update the text content

    // Update simulation
    simulation.nodes(data.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(data.links);

    // Add circular layout force for clusters
    data.nodes.filter(n => n.type === "cluster").forEach(cluster => {
        const children = data.nodes.filter(n =>
            data.links.some(l => l.target.id === cluster.id && l.source.id === n.id)
        );

        if (children.length > 0) {
            const radius = Math.max(100, children.length * 20);
            const angleStep = (2 * Math.PI) / children.length;

            children.forEach((child, i) => {
                const angle = i * angleStep;
                const targetX = cluster.x + radius * Math.cos(angle);
                const targetY = cluster.y + radius * Math.sin(angle);

                child.x = child.x || targetX;
                child.y = child.y || targetY;
            });
        }
    });

    simulation.alpha(1).restart();

    updateSelects();
}

// Delete functionality
function showDeleteModal() {
    document.getElementById("deleteModal").style.display = "block";
    document.querySelector(".modal-backdrop").style.display = "block";
    updateDeleteClusterSelect();
}

function updateDeleteClusterSelect() {
    const select = document.getElementById("deleteClusterSelect");
    select.innerHTML = '<option value="">Select Cluster</option>';
    data.nodes
        .filter(node => node.type === "cluster")
        .forEach(cluster => {
            const option = document.createElement("option");
            option.value = cluster.id;
            option.textContent = cluster.name;
            select.appendChild(option);
        });
}

function updateDeleteNodeList(clusterId) {
    const nodeList = document.getElementById("deleteNodeList");
    nodeList.innerHTML = '';

    // Get all nodes in the cluster
    const nodes = data.nodes.filter(node => {
        if (node.id === clusterId) return true;
        return data.links.some(link =>
            link.target.id === clusterId && link.source.id === node.id);
    });

    nodes.forEach(node => {
        const div = document.createElement("div");
        div.className = "node-list-item";
        div.textContent = `${node.name} (${node.type})`;
        div.onclick = () => selectNodeForDelete(node, div);
        nodeList.appendChild(div);
    });
}

function selectNodeForDelete(node, element) {
    selectedNodeForDelete = node;
    document.querySelectorAll(".node-list-item").forEach(item =>
        item.classList.remove("selected"));
    element.classList.add("selected");

    // Update warning message
    const warning = document.getElementById("deleteWarning");
    if (node.type === "cluster") {
        const connectedNodes = data.nodes.filter(n =>
            data.links.some(l => l.target.id === node.id && l.source.id === n.id)
        ).length;
        warning.textContent =
            `Warning: Deleting this cluster will also delete ${connectedNodes} connected nodes!`;
    } else {
        warning.textContent = "";
    }
}

function confirmDelete() {
    if (!selectedNodeForDelete) return;

    if (selectedNodeForDelete.type === "cluster") {
        // Delete cluster and all connected nodes
        const connectedNodeIds = data.nodes
            .filter(n => data.links.some(l =>
                l.target.id === selectedNodeForDelete.id && l.source.id === n.id
            ))
            .map(n => n.id);

        data.nodes = data.nodes.filter(n =>
            n.id !== selectedNodeForDelete.id && !connectedNodeIds.includes(n.id));
        data.links = data.links.filter(l =>
            !connectedNodeIds.includes(l.source.id) &&
            !connectedNodeIds.includes(l.target.id));
    } else {
        // Delete single node
        data.nodes = data.nodes.filter(n => n.id !== selectedNodeForDelete.id);
        data.links = data.links.filter(l =>
            l.source.id !== selectedNodeForDelete.id &&
            l.target.id !== selectedNodeForDelete.id);
    }

    selectedNodeForDelete = null;
    hideModals();
    updateGraph();
}

// Edit functionality
function showEditModal() {
    document.getElementById("editModal").style.display = "block";
    document.querySelector(".modal-backdrop").style.display = "block";
    updateEditClusterSelect();
}

function updateEditClusterSelect() {
    const select = document.getElementById("editClusterSelect");
    select.innerHTML = '<option value="">Select Cluster</option>';
    data.nodes
        .filter(node => node.type === "cluster")
        .forEach(cluster => {
            const option = document.createElement("option");
            option.value = cluster.id;
            option.textContent = cluster.name;
            select.appendChild(option);
        });
}

function updateEditNodeList(clusterId) {
    const nodeList = document.getElementById("editNodeList");
    nodeList.innerHTML = '';

    const nodes = data.nodes.filter(node => {
        if (node.id === clusterId) return true;
        return data.links.some(link =>
            link.target.id === clusterId && link.source.id === node.id);
    });

    nodes.forEach(node => {
        const div = document.createElement("div");
        div.className = "node-list-item";
        div.textContent = `${node.name} (${node.type})`;
        div.onclick = () => selectNodeForEdit(node, div);
        nodeList.appendChild(div);
    });
}

function selectNodeForEdit(node, element) {
    selectedNodeForEdit = node;
    document.querySelectorAll(".node-list-item").forEach(item =>
        item.classList.remove("selected"));
    element.classList.add("selected");
    document.getElementById("editNameInput").value = node.name;
}

function confirmEdit() {
    if (!selectedNodeForEdit) return;
    const newName = document.getElementById("editNameInput").value;
    if (newName.trim() === "") return;

    const node = data.nodes.find(n => n.id === selectedNodeForEdit.id);
    if (node) {
        node.name = newName;
    }

    selectedNodeForEdit = null;
    hideModals();
    updateGraph();
}

// Connection functionality
function showConnectionModal() {
    document.getElementById("connectionModal").style.display = "block";
    document.querySelector(".modal-backdrop").style.display = "block";
    updateConnectionSelects();
}

function updateConnectionSelects() {
    const sourceSelect = document.getElementById("sourceClusterSelect");
    const targetSelect = document.getElementById("targetClusterSelect");

    sourceSelect.innerHTML = '<option value="">Select Source Cluster</option>';
    targetSelect.innerHTML = '<option value="">Select Target Cluster</option>';

    data.nodes
        .filter(node => node.type === "cluster")
        .forEach(cluster => {
            const sourceOption = document.createElement("option");
            sourceOption.value = cluster.id;
            sourceOption.textContent = cluster.name;
            sourceSelect.appendChild(sourceOption.cloneNode(true));

            const targetOption = document.createElement("option");
            targetOption.value = cluster.id;
            targetOption.textContent = cluster.name;
            targetSelect.appendChild(targetOption);
        });
}

function updateConnectionNodeList(clusterId, type) {
    const nodeList = document.getElementById(`${type}NodeList`);
    nodeList.innerHTML = '';

    const nodes = data.nodes.filter(node => {
        if (node.id === clusterId) return true;
        return data.links.some(link =>
            link.target.id === clusterId && link.source.id === node.id);
    });

    nodes.forEach(node => {
        const div = document.createElement("div");
        div.className = "node-list-item";
        div.textContent = `${node.name} (${node.type})`;
        div.onclick = () => selectNodeForConnection(node, div, type);
        nodeList.appendChild(div);
    });
}

function selectNodeForConnection(node, element, type) {
    if (type === "source") {
        selectedSourceNode = node;
    } else {
        selectedTargetNode = node;
    }

    const nodeList = document.getElementById(`${type}NodeList`);
    nodeList.querySelectorAll(".node-list-item").forEach(item =>
        item.classList.remove("selected"));
    element.classList.add("selected");
}

function createConnection() {
    if (!selectedSourceNode || !selectedTargetNode) return;

    // Check if connection already exists
    const connectionExists = data.links.some(link =>
        (link.source.id === selectedSourceNode.id && link.target.id === selectedTargetNode.id) ||
        (link.source.id === selectedTargetNode.id && link.target.id === selectedSourceNode.id)
    );

    if (!connectionExists) {
        data.links.push({
            source: selectedSourceNode.id,
            target: selectedTargetNode.id,
            type: 'connection'
        });
    }

    selectedSourceNode = null;
    selectedTargetNode = null;
    hideModals();  // This should now properly hide all modals
    updateGraph();
}

// Update event listeners
document.getElementById("deleteClusterSelect").addEventListener("change", (e) => {
    updateDeleteNodeList(e.target.value);
});

document.getElementById("editClusterSelect").addEventListener("change", (e) => {
    updateEditNodeList(e.target.value);
});

document.getElementById("sourceClusterSelect").addEventListener("change", (e) => {
    updateConnectionNodeList(e.target.value, "source");
});

document.getElementById("targetClusterSelect").addEventListener("change", (e) => {
    updateConnectionNodeList(e.target.value, "target");
});

// Initialize graph
// updateGraph();

function showAddClusterModal() {
    document.getElementById("clusterModal").style.display = "block";
    document.querySelector(".modal-backdrop").style.display = "block";
}

function showAddTaskModal() {
    document.getElementById("taskModal").style.display = "block";
    document.querySelector(".modal-backdrop").style.display = "block";
}

function hideModals() {
    document.getElementById("clusterModal").style.display = "none";
    document.getElementById("taskModal").style.display = "none";
    document.getElementById("deleteModal").style.display = "none";
    document.getElementById("editModal").style.display = "none";
    document.getElementById("connectionModal").style.display = "none";  // Add this line
    document.querySelector(".modal-backdrop").style.display = "none";

    // Clear any input fields
    document.getElementById("taskInput").value = "";
    document.getElementById("clusterInput").value = "";
    document.getElementById("editNameInput").value = "";
}

function addCluster() {
    const clusterName = document.getElementById("clusterInput").value;
    if (clusterName.trim() === "") return;

    const clusterId = `cluster-${Date.now()}`;
    const clusterColor = clusterColors[nextColorIndex % clusterColors.length];
    nextColorIndex++;

    data.nodes.push({
        id: clusterId,
        name: clusterName,
        type: "cluster",
        color: clusterColor
    });

    hideModals();
    updateGraph();
}

function addTask() {
    const clusterId = document.getElementById("clusterSelect").value;
    const taskName = document.getElementById("taskInput").value;
    if (taskName.trim() === "" || !clusterId) return;

    const cluster = data.nodes.find(n => n.id === clusterId);
    const taskId = `task-${Date.now()}`;

    data.nodes.push({
        id: taskId,
        name: taskName,
        type: "task",
        color: cluster.color
    });

    data.links.push({
        source: taskId,
        target: clusterId
    });

    hideModals();
    updateGraph();
}

function handleNodeClick(event, d) {
    event.preventDefault();
    highlightNode(d);
}

function highlightNode(selectedNode) {
    node.classed("dimmed", false).classed("highlighted", false);
    link.classed("dimmed", false);

    if (selectedNode) {
        node.classed("dimmed", true);
        link.classed("dimmed", true);

        const connectedNodes = new Set();
        data.links.forEach(l => {
            if (l.source.id === selectedNode.id || l.target.id === selectedNode.id) {
                connectedNodes.add(l.source.id);
                connectedNodes.add(l.target.id);
            }
        });

        node.filter(d => connectedNodes.has(d.id))
            .classed("dimmed", false);
        node.filter(d => d.id === selectedNode.id)
            .classed("highlighted", true);

        link.filter(l =>
            connectedNodes.has(l.source.id) && connectedNodes.has(l.target.id)
        ).classed("dimmed", false);
    }
}

function updateSelects() {
    const clusterSelect = document.getElementById("clusterSelect");
    clusterSelect.innerHTML = '<option value="">Select Cluster</option>';

    data.nodes
        .filter(node => node.type === "cluster")
        .forEach(cluster => {
            const option = document.createElement("option");
            option.value = cluster.id;
            option.textContent = cluster.name;
            clusterSelect.appendChild(option);
        });
}

function ticked() {
    circularLayoutForce(simulation.alpha());

    // Update positions
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("transform", d => `translate(${d.x},${d.y})`);
}

function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
}

function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
}

function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
}

// Dummy functions for future features
// function showVisualizationOptions() {
//     alert("Visualization Options - Feature coming soon!");
// }

// function showExportOptions() {
//     alert("Export Graph - Feature coming soon!");
// }

// function showSettings() {
//     alert("Settings - Feature coming soon!");
// }

// function showHelp() {
//     alert("Help - Feature coming soon!");
// }

// Handle window resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight - 64;

    svg.attr("width", width)
        .attr("height", height);

    simulation.force("center", d3.forceCenter(width / 2, height / 2));
    simulation.alpha(0.3).restart();
});

// Initialize graph
updateGraph();
