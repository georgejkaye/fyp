var currentTerm;

/**
 * Change the text of an element with a given id.
 * @param {string} id   - The id of the element.
 * @param {string} text - the text to change to
 */
function changeText(id, text){
    document.getElementById(id).innerHTML = text;
}

/**
 * Get the text of an element with a given id.
 * @param {string} id - The id of the element.
 * @return {string} The text of the element.
 */
function getText(id){
    return document.getElementById(id).value;
}

/**
 * Get a 'pretty' string of an array with spaces in between each element.
 * @param {array} array - The array to get the string from.
 */
function prettyString(array){

    console.log(array);

    if(array.length !== 0){
        var string = array[0];

        if(array.length > 0){
            for(i = 1; i < array.length; i++){
                string += " ";
                string += array[i];
            }
        }
    }

    return string;
}

/**
 * Function to execute when the 'execute' button is pressed.
 */
function execute_button(){

    var text = tokenise(getText('input'));
    var frees = getText('env').split(" ");
    
    var env = new LambdaEnvironment();

    for(i = 0; i < frees.length; i++){
        env.pushTerm(frees[i]);
    }

    var term;

    if(typeof text !== "string"){
        term = parse(text, env)
        text = term.prettyPrint() + " ~  ~  ~ " + term.prettyPrintLabels();
    }

    changeText('result', text);

    currentTerm = term;

    drawGraph(currentTerm);
}

/**
 * Function to execute when the 'substitute' button is pressed.
 */
function substitute_button(){

    var s = tokenise(getText('s'));
    var j = getText('j');

    var frees = getText('env').split(" ");
    var env = new LambdaEnvironment();

    for(i = 0; i < frees.length; i++){
        env.pushTerm(frees[i]);
    }

    j = env.find(j);

    if(j === -1){
        changeText('result', "Variable not in environment");
    } else if(typeof s === "string"){
        changeText('result', s)
    } else {
        var newterm = substitute(parse(s, new LambdaEnvironment()), j, currentTerm);
        changeText('result', newterm.prettyPrint());
    }
}

/**
 * Function to execute when the 'evaluate' button is pressed.
 */
function evaluate_button(){

    var res = evaluate(currentTerm);

    console.log("Evaluated term: " + res.prettyPrint());

    changeText('result', res.prettyPrint());

}

/**
 * Function to execute when the 'normalise' button is pressed.
 */
function normalise_button(){

    var res = normalise(currentTerm);

    console.log("Normalised term: " + res.prettyPrint());

    var text = res.prettyPrint() + " ~ ~ ~ " + res.prettyPrintLabels();

    changeText('result', text);

}

function beta_button(){

    var frees = getText('env').split(" ");
    var env = new LambdaEnvironment();

    for(i = 0; i < frees.length; i++){
        env.pushTerm(frees[i]);
    }

    var t1 = parse(tokenise(getText('b1')), env);
    var t2 = parse(tokenise(getText('b2')), env);

    var res = applicationAbstraction(t1, t2)

    var text = res.prettyPrint() + " ~ ~ ~ " + res.prettyPrintLabels();

    changeText('result', text)

}