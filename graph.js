/** Array containing all node ids used in the current graph */
var nodes = [];
/** Array containing all node objects used in the current graph */
var nodeObjs = [];
/** Array containing all edge ids used in the current graph */
var edges = [];
/** The graph object */
var cy = undefined;
/** Constants to represent the location of a child relative to its parent */
const LHS = 0;
const RHS = 1;
/** The current position of the parent */
var parentPos = [0,0];
/** The distance between adjacent nodes in the X direction */
const nodeDistanceX = 100;
/** The distance between adjacent nodes in the Y direction */
const nodeDistanceY = 75;
/** The distance between support nodes and their parent in the X direction */
const supportDistanceX = 50;
/** The distance between support nodes and their parent in the Y direction */
const supportDistanceY = 50;

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
    parentType = undefined;
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
 * Get the furthest left x coordinate of a node in an array of elements
 * @param {Object[]} array - The array of elements
 * @return {number} the furthest left x coordinate
 */
function furthestLeft(array){

    left = array[0].position.x;

    for(i = 1; i < array.length; i++){

        if(array[i].position !== undefined){
            const newLeft = array[1].position.x;

            if(newLeft < left){
                left = newLeft;
            }
        }
    }

    return left;
}

/**
 * Get the furthest right x coordinate of a node in an array of elements.
 * @param {Object[]} array - The array of elements.
 * @return {number} the furthest left x coordinate.
 */
function furthestRight(array){

    var right = array[0].position.x;

    for(i = 1; i < array.length; i++){

        if(array[i].position !== undefined){
            const newRight = array[1].position.x;

            if(newRight > left){
                right = newRight;
            }
        }
    }

    return right;
}

/**
 * Shift all the x coordinates of nodes in an array of elements.
 * @param {Object[]} array - The array of elements. 
 * @param {number} x - The amount to shift the x coordinates. 
 * @param {Object[]} - The array with all the elements shifted.
 */
function shiftXs(array, x){

    for(i = 0; i < array.length; i++){
        array[i].position.x += x; 
    }

    return array;
}

/**
 * Generate the elements of the map of a term.
 * @param {Object} term - The lambda term to generate the elements of the map for.  
 * @param {Object[]} array - The array to put the elements in. 
 * @param {string} parent - The ID of the parent of the current term. 
 * @param {number} parentX - The x coordinate of the parent. 
 * @param {number} parentY - The y coordinate of the parent.
 * @param {number} position - The position (LHS or RHS) of the current element.
 */
function generateMapElements(term, array, parent, parentX, parentY, position){

    /* If there is no element array, create one */
    if(array === undefined){
        array = [];
    }

    var posX = 0;
    var posY = 0;

    /* If this is the start of the map, create a root node. */
    if(parent === undefined){

        parent = ">";
        parentX = 0;
        parentY = 0;

        var rootNode = { data: { id: ">"}, position: { x: parentX, y: parentY }};
        array = pushNode(array, rootNode);

        posX = parentX;
        posY = parentY - nodeDistanceY;

    } else {

        posY = parentY - nodeDistanceY;

        if(position === LHS){
            posX = parentX - nodeDistanceX; 
        } else {
            posX = parentX + nodeDistanceX;
        }
    }

    var newNode;
    var newEdge;
    var nodeID = "";
    var edgeID = "";
    var edgeType = "";

    switch(term.getType()){
        case ABS:

        nodeID = checkID("\u03BB" + term.label + ".", nodes);
        newNode = { data: { id: nodeID, type: "abs-node" }, position: { x: posX, y: posY}};

        array = pushNode(array, newNode);

        edgeID = checkID(nodeID + " " + term.t.prettyPrintLabels(), edges);
        edgeType = "abs-edge";

        array = generateMapElements(term.t, array, nodeID, posX, posY, LHS);

        break;
        
        case APP:
        
        nodeID = checkID("[" + term.t1.prettyPrintLabels() + " @ " + term.t2.prettyPrintLabels() + "]", nodes);
        newNode = { data: { id: nodeID, type: "app-node"}, position: {x: posX, y: posY}};

        array = pushNode(array, newNode);

        edgeID = checkID("(" + nodeID + ")", edges);
        edgeType = "app-edge";
        
        var lhsArray = generateMapElements(term.t1, [], nodeID, posX, posY, LHS);
        const rightmostX = furthestRight(lhsArray);

        var rhsArray = generateMapElements(term.t2, [], nodeID, posX, posY, RHS);
        const leftmostX = furthestLeft(rhsArray);

        if(rightmostX >= leftmostX){
            array = shiftXs(rhsArray, leftmostX - rightmostX + nodeDistanceX);
        }

        array = array.concat(lhsArray);
        array = array.concat(rhsArray);

        break;

        case VAR:

        nodeID = checkID("{" + term.label + "}", nodes);
        newNode = { data: { id: nodeID, type: "var-supp"}, position: {x: posX, y: posY}};

        array = pushNode(array, newNode);
        edgeID = checkID("{" + term.label + "} in " + parent, edges);

        break;
    }

    /* Create an edge linking the newest node with its parent */
    newEdge = { data: { id: edgeID, source: nodeID, target: parent, type: edgeType}};
    array = pushEdge(array, newEdge);

    return array;
    
}

/**
 * Convert a lambda expression into an array of all the graph elements
 * @param {Object} term - The term to convert into an array of elements.
 * @param {Object[]} array - The array to place all the elements into.
 * @param {Object} parent - The parent of the current term (can be undefined).
 * @param {number} parentType - The type of the parent node (can be undefined).
 * @return {Object[]} The array containing all of the elements.
 */
function convertToElems(term, array, parent, parentType){

    var noAbs = 0;

    // At the first level an empty array must be created
    if(array === undefined){
        array = [];
    }

    var posX;
    var posY;

    // Root of lambda expression is connected to the root (represented as box) node
    if(parent === undefined){
        var startNode = { data: { id: ">"}, position: { x: 0, y: 0}};
        parent = ">";

        posX = 0;
        posY = -nodeDistanceY;

        array = pushNode(array, startNode, ">");

    } else {

        switch(parentType){
            case LHS:
                posX = parentPos[0] - nodeDistanceX;
                posY = parentPos[1] - nodeDistanceY;
                break;
            case RHS:
                posX = parentPos[0] + nodeDistanceX;
                posY = parentPos[1] - nodeDistanceY;
                break;
        }

    }

    parentPos = [posX, posY];

    switch(term.getType()){

        /*
         * An abstraction creates a node.
         * This node has many (linear: only one) outgoing edges that 'feed' the abstracted variable into applications.
         * This node has one ingoing edge from the scope of the abstraction.
         */
        case ABS:

            noAbs++;

            var nodeID = checkID("\u03BB" + term.label + ".", nodes);

            // The lambda node

            var lambdaNode = { data: { id: nodeID, type: "abs-node" }, position: {x: posX, y: posY}};

            console.log(posX + ", " + posY);

            array = pushNode(array, lambdaNode, nodeID);

            // The edge linking the lambda node with its parent
            
            var edgeID = checkID(nodeID + " " + term.t.prettyPrintLabels(), edges);
            var edge = { data: { id: edgeID, source: nodeID, target: parent, type: "abs-edge"}};
            array = pushEdge(array, edge, edgeID);

            // Go inside the abstraction
            array = convertToElems(term.t, array, nodeID, LHS);

            break;

        /*
         * An application creates a node.
         * This node has one ougoing edge that 'feeds' the application to its parent (be it another application or an abstraction).
         * This node has two ingoing edges from the two terms that make up the application.
         */
        case APP:

            var nodeID = checkID("[" + term.t1.prettyPrintLabels() + " @ " + term.t2.prettyPrintLabels() + "]", nodes);
            
            // The application node

            var appNode = { data: { id: nodeID, type: "app-node" },  position: {x: posX, y: posY}};

            console.log(posX + ", " + posY);

            array = pushNode(array, appNode, nodeID);
            
            // Check to see if the lhs is a variable
            if(term.t1.getType() === VAR){

                var newNode = { data: { id: nodeID + "support-lhs", type: "app-supp" },  position: {x: posX, y: posY - supportDistanceY}};
                array = pushNode(array, newNode, nodeID + "support-lhs");

                var edgeID = checkID("(" + term.t1.label + " in " + nodeID + ")", edges);
                var sourceID = "\u03BB" + term.t1.label + ".";

                if(!nodes.includes(sourceID)){
                    var externalNode = { data: { id: sourceID, type: "abs-node" }, classes: 'global'};
                    array = pushNode(array, externalNode, sourceID);
                    classes = 'dashed';
                }

                var t1edge = { data: { id: edgeID, source: sourceID, target: nodeID + "support-lhs", type: "var-edge" }};
                array = pushEdge(array, t1edge, edgeID);

                var newEdge = { data: { id: edgeID + "supp-lhs", source: nodeID + "support-lhs", target: nodeID, type: "var-edge-supp" }};
                array = pushEdge(array, newEdge, edgeID + "supp-lhs");

            } else {
                array = convertToElems(term.t1, array, nodeID, LHS);
            }

            // Check to see if the rhs is a variable
            if(term.t2.getType() === VAR){

                var newNode = { data: { id: nodeID + "support-rhs", type: "app-supp" },  position: {x: posX + supportDistanceX, y: posY - supportDistanceY}};
                array = pushNode(array, newNode, nodeID + "support-rhs");

                var edgeID = checkID("(" + term.t2.label + " in " + nodeID + ")", edges);
                var sourceID = "\u03BB" + term.t2.label + "."; 
                
                if(!nodes.includes(sourceID)){
                    var externalNode = { data: { id: sourceID, type: "abs-node" }, classes: 'global' };
                    array = pushNode(array, externalNode, sourceID);
                    classes = 'dashed'
                }

                var t2edge = { data: { id: edgeID, source: sourceID, target: nodeID + "support-rhs", type: "var-edge" }};
                array = pushEdge(array, t2edge, edgeID);

                var newEdge = { data: { id: edgeID + "supp-rhs", source: nodeID + "support-rhs", target: nodeID, type: "var-edge-supp" }};
                array = pushEdge(array, newEdge, edgeID + "supp-rhs");

            } else {
                array = convertToElems(term.t2, array, nodeID, RHS);
            }

            // The edge linking the application node with its parent
            var edgeID = checkID("(" + nodeID + ")", edges);
            var edge = { data: { id: edgeID, source: nodeID, target: parent, type: "app-edge" }};
            array = pushEdge(array, edge, edgeID);

            break;

        /*
         * A lone variable creates an edge from where it was abstracted to where it is being applied.
         */
        case VAR:

            // If a lone variable has been encountered it's an application with the id function
            
            var sourceID = "\u03BB" + term.label + ".";

            if(!nodes.includes(sourceID)){
                var externalNode = { data: { id: sourceID, type: "abs-node" }, classes: 'global'}
                array = pushNode(array, externalNode, sourceID);
            }
            
            var edgeID = "id " + term.label;
            var idEdge = { data: {id: edgeID, source: sourceID, target: parent, type: "id-edge" }};
            
            array = pushEdge(array, idEdge, edgeID);

            break;

    }

    return array;

}

/**
 * Fix the support node positions in the array of elements.
 */
function fixSupports(elems){

    if(elems.length > 0){

        var highest = elems[elems.length - 1].position('y');
        var j = 0;

        for(i = elems.length - 1; i >= 0; i--){
            elems[i].position('y', highest - (-(elems[i].position('x')/8 * j)));
            j++;
        }
    }

}

/**
 * Push a node onto the various arrays.
 * @param {Object[]} array - The array all the elements are stored in.
 * @param {Object} node - The node object.
 * @param {string} nodeID - The node ID.
 * @return {Object[]} The updated array all the elements are stored in.
 */
function pushNode(array, node, nodeID){
    smartPush(array, node);
    smartPush(nodes, nodeID);
    smartPush(nodeObjs, node);

    return array;
}

/**
 * Push an edge onto the various arrays.
 * @param {Object[]} array - The array all the elements are stored in.
 * @param {Object} edge - The edge object.
 * @param {string} edgeID - The edge ID.
 * @return {Object[]} The updated array all the elements are stored in.
 */
function pushEdge(array, edge, edgeID){
    smartPush(array, edge);
    smartPush(edges, edgeID);

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

function getNumber(id){

    for(i = 0; i < edges.length; i++){

        if(edges[i] === id){
            return i;
        }
    }

    return -1;
}

/**
 * Update the labels on the graph
 * @param {boolean} labels - Whether labels are shown
 */
function updateLabels(labels){

    if(labels){
        
        cy.style().selector('node[type = "abs-node"]').style({'label': '\u03BB'}).update();
        cy.style().selector('node[type = "app-node"]').style({'label': '@'}).update();
        cy.style().selector('edge[type = "abs-edge"]').style({'label': 'data(id)'}).update();
        
        cy.style().selector('edge[type = "id-edge"]').style({'label': function(ele){
            return ele.data().id.substring(3);
        }}).update();

        cy.style().selector('edge[type = "var-edge"]').style({'label': function(ele){
            var id = ele.data().id.substring(1);
            var res = id.split(" ");
            return res[0];
        }}).update();
        
        cy.style().selector('edge[type = "app-edge"]').style({'label': function(ele){
            
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

    var elems = generateMapElements(term);

    cy = cytoscape({
        container: document.getElementById("cy"),

        elements: elems,
      
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#666',
                    'text-valign': 'center',
                    'color': 'white'
                }
            },
      
            {
                selector: 'node[type = "var-supp"]',
                style: {
                    'width': '10',
                    'height': '10',
                    'background-color': '#ccc',
                    'shape': 'roundrectangle'
                }
            },

            {
                selector: 'edge',
                style: {
                'width': 3,
                'line-color': '#ccc',
                'mid-target-arrow-color': '#ccc',
                'mid-target-arrow-shape': 'triangle',
                'arrow-scale': 1.2,
                }
            },

            {
                selector: 'edge[type = "var-edge"]',
                style: {
                    'curve-style': 'unbundled-bezier',
                    'control-point-distances': function(ele){

                        var x = getNumber(ele.data().id);
                        var y = (edges.length * 200) / x;

                        return y;

                    },
                    'control-point-weights': '0.5',
                    'loop-direction': '45deg',
                    'edge-distances': 'node-position'
                    
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

  fixSupports(cy.elements('node[type = "app-supp"]'));

  updateLabels(document.getElementById('labels-yes').checked);

}