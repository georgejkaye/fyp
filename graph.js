/** Array containing all node ids used in the current graph */
var nodes = [];
/** Array containing all node objects used in the current graph */
var nodeObjs = [];
/** Array containing all edge ids used in the current graph */
var edges = [];
/** The graph object */
var cy = undefined;
/** The current position of the parent */
var parentPos = [0,0];
/** The distance between nodes */
const nodeDistance = 100;

/**
 * Reset the nodes and edges arrays
 */
function reset(){
    nodes = [];
    nodeObjs = [];
    edges = [];
    cy = undefined;
    firstNode = undefined;
    parent = [0,0];
}

/**
 * Find the node that generates a given function (could be an abstraction or an application!).
 * @param {string} fun The name of the function.
 */
function findNode(fun){

    var funComps = fun.split(' ');
    
    if(funComps.length === 2){
        fun = funComps[0] + " @ " + funComps[1];
    }

    console.log("Looking for function " + fun);

    for(i = 0; i < nodeObjs.length; i++){

        var id = nodeObjs[i].data.id;

        if(nodeObjs[i].data.type === "abs-node"){

            if(id.substring(1, id.length - 1) === fun){
                return nodeObjs[i];
            }

        } else if(nodeObjs[i].data.type === "app-node"){

            var lhs = id.substring(1, id.length - 1);

            console.log("Comparing function " + fun + " with " + lhs);

            if(lhs === fun){
                return nodeObjs[i];

            }
        }

    }

    return null;
}

/**
 * Convert a lambda expression into an array of all the graph elements
 * @param {Object} term - The term to convert into an array of elements.
 * @param {Object[]} array - The array to place all the elements into.
 * @param {Object} parent - The parent of the current term (can be undefined).
 * @param {Object} edges - The list of edges in the graph (for when edges are named the same).
 * @return {Object[]} The array containing all of the elements.
 */
function convertToElems(term, array, parent){

    // At the first level an empty array must be created
    if(array === undefined){
        array = [];
    }

    // Root of lambda expression is connected to the root (represented as box) node
    if(parent === undefined){
        var startNode = { data: { id: ">"}, position: { x: 0, y: 0}};
        parent = ">";
        parentPos = [0,0];
        smartPush(array, startNode);
        smartPush(nodeObjs, startNode);
    }

    var posX;
    var posY;

    switch(term.getType()){

        /*
         * An abstraction creates a node.
         * This node has many (linear: only one) outgoing edges that 'feed' the abstracted variable into applications.
         * This node has one ingoing edge from the scope of the abstraction.
         */
        case ABS:

            var nodeID = checkID("\u03BB" + term.label + ".", nodes);

            // The lambda node

            if(parentPos[1] === 0){
                posX = parentPos[0];
                posY = parentPos[1] - nodeDistance;
            } else {
                posX = parentPos[0] - nodeDistance;
                posY = parentPos[1] - nodeDistance;
            }

            var lambdaNode = { data: { id: nodeID, type: "abs-node" }, position: {x: posX, y: posY}};

            parentPos[0] = posX;
            parentPos[1] = posY;

            console.log(posX + ", " + posY);

            smartPush(array, lambdaNode);
            smartPush(nodes, nodeID);
            smartPush(nodeObjs, lambdaNode);

            // The edge linking the lambda node with its parent
            
            var edgeID = checkID(nodeID + " " + term.t.prettyPrintLabels(), edges);
            var edge = { data: { id: edgeID, source: nodeID, target: parent, type: "abs"}};
            smartPush(array, edge);
            smartPush(edges, edgeID);

            // Go inside the abstraction
            array = convertToElems(term.t, array, nodeID);

            break;

        /*
         * An application creates a node.
         * This node has one ougoing edge that 'feeds' the application to its parent (be it another application or an abstraction).
         * This node has two ingoing edges from the two terms that make up the application.
         */
        case APP:

            var nodeID = checkID("[" + term.t1.prettyPrintLabels() + " @ " + term.t2.prettyPrintLabels() + "]", nodes);
            
            // The application node

            if(parentPos[1] === 0){
                posX = parentPos[0];
                posY = parentPos[1] - nodeDistance;
            } else {
                posX = parentPos[0] + nodeDistance;
                posY = parentPos[1] - nodeDistance;
            }

            var appNode = { data: { id: nodeID, type: "app-node" },  position: {x: posX, y: posY}};

            console.log(posX + ", " + posY);

            parentPos[0] = posX;
            parentPos[1] = posY;

            smartPush(array, appNode);
            smartPush(nodes, nodeID);
            smartPush(nodeObjs, appNode);

            // Check to see if the rhs is a variable
            if(term.t2.getType() === VAR){

                var edgeID = checkID("(" + term.t2.label + " in " + nodeID + ")", edges);
                var sourceID = "\u03BB" + term.t2.label + "."; 
                var classes = "";
                
                if(!nodes.includes(sourceID)){
                    var externalNode = { data: { id: sourceID, type: "abs-node" }, classes: 'global' };
                    smartPush(array, externalNode);
                    smartPush(nodes, sourceID);
                    smartPush(nodeObjs, externalNode);
                    classes = 'dashed'
                }

                var t2edge = { data: { id: edgeID, source: sourceID, target: nodeID, type: "var" }};
                smartPush(array, t2edge);
                smartPush(edges, edgeID);

            } else {
                array = convertToElems(term.t2, array, nodeID);
            }
            
            // Check to see if the lhs is a variable
            if(term.t1.getType() === VAR){

                var edgeID = checkID("(" + term.t1.label + " in " + nodeID + ")", edges);
                var sourceID = "\u03BB" + term.t1.label + ".";
                var classes = "";

                if(!nodes.includes(sourceID)){
                    var externalNode = { data: { id: sourceID, type: "abs-node" }, classes: 'global'};
                    smartPush(array, externalNode);
                    smartPush(nodes, sourceID);
                    smartPush(nodeObjs, externalNode);
                    classes = 'dashed';
                }

                var t1edge = { data: { id: edgeID, source: sourceID, target: nodeID, type: "var" }};
                smartPush(array, t1edge);
                smartPush(edges, edgeID);

            } else {
                array = convertToElems(term.t1, array, nodeID);
            }

            var funNode = findNode(term.t1.prettyPrintLabels());
            var funX = funNode.position.x;
            appNode.position.x = funX;
            appNode.position.y += (funX / 2)


            // The edge linking the application node with its parent
            var edgeID = checkID("(" + nodeID + ")", edges);
            var edge = { data: { id: edgeID, source: nodeID, target: parent, type: "app" }};
            smartPush(array, edge);
            smartPush(edges, edgeID);

            break;

        /*
         * A lone variable creates an edge from where it was abstracted to where it is being applied.
         */
        case VAR:

            // If a lone variable has been encountered it's an application with the id function
            
            var sourceID = "\u03BB" + term.label + ".";

            if(!nodes.includes(sourceID)){
                var externalNode = { data: { id: sourceID, type: "abs" }, classes: 'global'}
                smartPush(array, externalNode);
                smartPush(nodes, sourceID);
            }
            
            var idEdge = { data: {id: "id " + term.label, source: sourceID, target: parent, type: "id" }};
            
            smartPush(array, idEdge);

            break;

    }

    console.log(" ");

    for(i = 0; i < array.length; i++){

        if(array[i].data.type === "app-node"){

            var id = array[i].data.id;
            console.log(id);

            var args = id.split(" @ ")[0].substring(1);
            var elms = args.split(' ');
            
            // single term
            if(elms.length === 1){

                var var1 = elms[0]

                console.log("var " + var1);

                for(j = 0; j < nodes.length; j++){

                    console.log(nodes[j].substring(1, ));

                    if(var1 === nodes[j].substring(1, nodes[j].length - 1)){
            
                    }

                }

            }


        }

    }

    return array;

}

/**
 * Check to make sure an id is not used in an array, and suffixes a prime (') after it if it does.
 * @param {string} id - The id to check.
 * @param {Object[]} array - The array to search for duplicates in.
 * @return {string} The id, suffixed with primes if necessary.
 */
function checkID(id, array){
    
    while(array.includes(id)){
        id += "\'";
    }

    return id;
}

/**
 * Update the labels on the graph
 * @param {boolean} labels - Whether labels are shown
 */
function updateLabels(labels){

    if(labels){
        
        cy.style().selector('node[type = "abs-node"]').style({'label': '\u03BB'}).update();
        cy.style().selector('node[type = "app-node"]').style({'label': 'data(id)'}).update();
        cy.style().selector('edge[type = "abs"]').style({'label': 'data(id)'}).update();
        
        cy.style().selector('edge[type = "id"]').style({'label': function(ele){
            return ele.data().id.substring(3);
        }}).update();

        cy.style().selector('edge[type = "var"]').style({'label': function(ele){
            var id = ele.data().id.substring(1);
            var res = id.split(" ");
            return res[0];
        }}).update();
        
        cy.style().selector('edge[type = "app"]').style({'label': function(ele){
            
            var terms = ele.data().id.substring(2, ele.data().id.length - 2).split(" @ ");

            if(terms[1].split(" ").length > 1){
               terms[1] = "(" + terms[1] + ")";
            }

            if(terms[0].substring(0,1) === "\u03BB"){
                terms[0] = "(" + terms[0] + ")";
            }

            return terms[0] + " " + terms[1];

        }}).update();

    } else {
        cy.style().selector('node').style({'label': ''}).update();
        cy.style().selector('edge').style({'label': ''}).update();
    }
}

/**
 * Draw a graph representing a lambda term into the graph box.
 * @param {Object} term - The term to draw as a graph.
 */
function drawGraph(term){

    reset();

    var elems = convertToElems(term);
    
    cy = cytoscape({
        container: document.getElementById("cy"),

        elements: elems,
      
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#666',
                }
            },
      
            {
                selector: 'edge',
                style: {
                'width': 3,
                'line-color': '#ccc',
                'mid-target-arrow-color': '#ccc',
                'mid-target-arrow-shape': 'triangle',
                'arrow-scale': 2,
                'curve-style': 'bezier',
                'control-point-step-size': '200px',
                }
            },

            {
                selector: '.global',
                style: {
                    'background-color': '#f00'
                }
            },

            {
                selector: '.dashed',
                style: {
                    'width': 5
                }
            },

        ],

        layout: {
            name: 'preset'
        }
  });

  updateLabels(document.getElementById('labels-yes').checked);

}