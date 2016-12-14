/* GLOBAL CONSTANTS AND VARIABLES */
//https://drive.google.com/open?id=   
/* assignment specific globals */
//https://ncsucgclass.github.io/prog3/triangles.json
// const INPUT_TRIANGLES_URL = "https://api.myjson.com/bins/4pavj"; // Map#2
// const INPUT_TRIANGLES_URL = "https://api.myjson.com/bins/24acb"; // Map#3
// const INPUT_TRIANGLES_URL = "https://api.myjson.com/bins/2gs71"; // Current 
//const INPUT_TRIANGLES_URL ="https://api.myjson.com/bins/3mtmn"; // 2 levels 
// const INPUT_TRIANGLES_URL ="https://kspatil2.github.io/texture_road.json";
//const INPUT_TRIANGLES_URL ="https://api.myjson.com/bins/1a9n49";
const INPUT_TRIANGLES_URL ="https://api.myjson.com/bins/kr07h";
const INPUT_SPHERES_URL = "https://kspatil2.github.io/spaceship1.json"; // spheres file loc
var defaultEye = vec3.fromValues(0.5,0.8,-1); // default eye position in world space
var defaultCenter = vec3.fromValues(0.5,0.8,0.5); // default view direction in world space
var defaultUp = vec3.fromValues(0,1,0); // default view up vector
var lightAmbient = vec3.fromValues(1,1,1); // default light ambient emission
var lightDiffuse = vec3.fromValues(1,1,1); // default light diffuse emission
var lightSpecular = vec3.fromValues(1,1,1); // default light specular emission
var lightPosition = vec3.fromValues(20,300,75); // default light position
var defaultlightPosition = vec3.fromValues(0.5,4,0.4); // default light position
var rotateTheta = Math.PI/50; // how much to rotate models by with each key press

/* webgl and geometry data */
var gl = null; // the all powerful gl object. It's all here folks!
var inputTriangles = []; // the triangle data as loaded from input files
var numTriangleSets = 0; // how many triangle sets in input scene
var inputSpheres = []; // the sphere data as loaded from input files
var numSpheres = 0; // how many spheres in the input scene
var vertexBuffers = []; // this contains vertex coordinate lists by set, in triples
var normalBuffers = []; // this contains normal component lists by set, in triples
textureBuffers = [];
var triSetSizes = []; // this contains the size of each triangle set
var triangleBuffers = []; // lists of indices into vertexBuffers by set, in triples
var viewDelta = 0; // how much to displace view with each key press

/* shader parameter locations */
var vPosAttribLoc; // where to put position for vertex shader
var vNormAttribLoc;
var textureCoordAttribute;
var samplerUniform;
var alphaUniform;
var isTextureUniform;
var ambientULoc; // where to put ambient reflecivity for fragment shader
var diffuseULoc; // where to put diffuse reflecivity for fragment shader
var specularULoc; // where to put specular reflecivity for fragment shader
var shininessULoc; // where to put specular exponent for fragment shader
var mMatrixULoc; // where to put model matrix for vertex shader
var pvmMatrixULoc; // where to put project model view matrix for vertex shader
/* interaction variables */
var Eye = vec3.clone(defaultEye); // eye position in world space
var Center = vec3.clone(defaultCenter); // view direction in world space
var Up = vec3.clone(defaultUp); // view up vector in world space

var acceleration = 0.003;
var deacceleration = 0.006;
var velocity=0;

var spaceJump=0.0; // flag if in jumping
var jumpTime=1; // half total time of jump till the top
var spaceJumpCounter=0; // time = t
var freeFallTime=0;
var jumpVelocity=0.1; // v = u0
var gravity = 0.1;
var freefall_velocity=0;

var sideJump=0.0; // flag if in jumping
var sidejumpTime=1; // half total time of jump till the top
var sideJumpCounter=0; // time = t
var sidejumpVelocity=0.04; // v = u0
var sidegravity = 0.04;
var left=0,right=0;
// var freeFallTime=0;
// var freefall_velocity=0;
var NUMBER_OF_LEVELS = 5;
var Score=0;
var HighScore = 0;

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input spheres

// does stuff when keys are pressed
function handleKeyDown(event) {
    
    const modelEnum = {TRIANGLES: "triangles", SPHERE: "sphere"}; // enumerated model type
    const dirEnum = {NEGATIVE: -1, POSITIVE: 1}; // enumerated rotation direction
    
    function highlightModel(modelType,whichModel) {
        handleKeyDown.modelOn = inputSpheres[0];
        if (handleKeyDown.modelOn != null)
            handleKeyDown.modelOn.on = false;
        handleKeyDown.whichOn = whichModel;
        if (modelType == modelEnum.TRIANGLES)
            handleKeyDown.modelOn = inputTriangles[whichModel]; 
        else
            handleKeyDown.modelOn = inputSpheres[whichModel]; 
        handleKeyDown.modelOn.on = true; 
    } // end highlight model
    
    function translateModel(offset, currModel) {
        // if (handleKeyDown.modelOn != null)
                vec3.add(handleKeyDown.modelOn.translation,handleKeyDown.modelOn.translation,offset);   
    } // end translate model

    function rotateModel(axis,direction) {
        if (handleKeyDown.modelOn != null) {
            var newRotation = mat4.create();

            mat4.fromRotation(newRotation,direction*rotateTheta,axis); // get a rotation matrix around passed axis
            vec3.transformMat4(handleKeyDown.modelOn.xAxis,handleKeyDown.modelOn.xAxis,newRotation); // rotate model x axis tip
            vec3.transformMat4(handleKeyDown.modelOn.yAxis,handleKeyDown.modelOn.yAxis,newRotation); // rotate model y axis tip
        } // end if there is a highlighted model
    } // end rotate model
    
    // set up needed view params
    var lookAt = vec3.create(), viewRight = vec3.create(), temp = vec3.create(); // lookat, right & temp vectors
    lookAt = vec3.normalize(lookAt,vec3.subtract(temp,Center,Eye)); // get lookat vector
    viewRight = vec3.normalize(viewRight,vec3.cross(temp,lookAt,Up)); // get view right vector
    
    // highlight static variables
    handleKeyDown.whichOn = handleKeyDown.whichOn == undefined ? -1 : handleKeyDown.whichOn; // nothing selected initially
    handleKeyDown.modelOn = handleKeyDown.modelOn == undefined ? null : handleKeyDown.modelOn; // nothing selected initially

    // spaceship highlighted
    highlightModel(modelEnum.SPHERE,(handleKeyDown.whichOn > 0) ? handleKeyDown.whichOn-1 : numSpheres-1);

    // spaceship motion
    
    var time=1;
    switch (event.code) {
        
        // model selection
        case "Space":
                if(spaceJump!=1) // ensure no jump called between another jump 
                {
                    // sound for jump    
                    playSound("jump",true);
                    spaceJump=1;
                    spaceJumpCounter=0.0;
                }
                // jumpTime=0;    
                // yet to write double jump ... well, what do u know ... already did it
            break;
        case "ArrowRight": // select next triangle set
                if(sideJump!=1) // ensure no jump called between another jump 
                {   
                    left=0;
                    right=1;
                    sideJump=1;
                    sideJumpCounter=0.0;
                }
            break;
        case "ArrowLeft": // select previous triangle set
                if(sideJump!=1) // ensure no jump called between another jump 
                {   
                    left=1;
                    right=0;
                    sideJump=1;
                    sideJumpCounter=0.0;
                }
                // translateModel(vec3.scale(temp,viewRight,viewDelta));
            break;
        case "ArrowUp": // select next sphere
                if(level_transition==0)
                    velocity = velocity + acceleration*time;
            break;
        case "ArrowDown": // select previous sphere
                if(velocity>0)
                {
                    velocity = velocity - deacceleration*time;
                    if(velocity<0)
                        velocity=0;

                }
                
            break;
            
        // view change
        // case "KeyA": // translate view left, rotate left with shift
            // Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,viewDelta));
            // if (!event.getModifierState("Shift"))
                // Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,viewDelta));
            // break;
        // case "KeyD": // translate view right, rotate right with shift
            // Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,-viewDelta));
            // if (!event.getModifierState("Shift"))
                // Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,-viewDelta));
            // break;
        // case "KeyS": // translate view backward, rotate up with shift
            // if (event.getModifierState("Shift")) {
                // Center = vec3.add(Center,Center,vec3.scale(temp,Up,viewDelta));
                // Up = vec.cross(Up,viewRight,vec3.subtract(lookAt,Center,Eye)); /* global side effect */
            // } else {
                // Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,-viewDelta));
                // Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,-viewDelta));
            // } // end if shift not pressed
            // break;
        // case "KeyW": // translate view forward, rotate down with shift
            // if (event.getModifierState("Shift")) {
                // Center = vec3.add(Center,Center,vec3.scale(temp,Up,-viewDelta));
                // Up = vec.cross(Up,viewRight,vec3.subtract(lookAt,Center,Eye)); /* global side effect */
            // } else {
                // Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,viewDelta));
                // Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,viewDelta));
            // } // end if shift not pressed
            // break;
        // case "KeyQ": // translate view up, rotate counterclockwise with shift
            // if (event.getModifierState("Shift"))
                // Up = vec3.normalize(Up,vec3.add(Up,Up,vec3.scale(temp,viewRight,-viewDelta)));
            // else {
                // Eye = vec3.add(Eye,Eye,vec3.scale(temp,Up,viewDelta));
                // Center = vec3.add(Center,Center,vec3.scale(temp,Up,viewDelta));
            // } // end if shift not pressed
            // break;
        // case "KeyE": // translate view down, rotate clockwise with shift
            // if (event.getModifierState("Shift"))
                // Up = vec3.normalize(Up,vec3.add(Up,Up,vec3.scale(temp,viewRight,viewDelta)));
            // else {
                // Eye = vec3.add(Eye,Eye,vec3.scale(temp,Up,-viewDelta));
                // Center = vec3.add(Center,Center,vec3.scale(temp,Up,-viewDelta));
            // } // end if shift not pressed
            // break;
        // case "Escape": // reset view to default
            // Eye = vec3.copy(Eye,defaultEye);
            // Center = vec3.copy(Center,defaultCenter);
            // Up = vec3.copy(Up,defaultUp);
            // break;
            
        // // model transformation
        // case "KeyK": // translate left, rotate left with shift
            // if (event.getModifierState("Shift"))
                // rotateModel(Up,dirEnum.NEGATIVE);
            // else
                // translateModel(vec3.scale(temp,viewRight,viewDelta));
            // break;
        // case "Semicolon": // translate right, rotate right with shift
            // if (event.getModifierState("Shift"))
                // rotateModel(Up,dirEnum.POSITIVE);
            // else
                // translateModel(vec3.scale(temp,viewRight,-viewDelta));
            // break;
        // case "KeyL": // translate backward, rotate up with shift
            // if (event.getModifierState("Shift"))
                // rotateModel(viewRight,dirEnum.POSITIVE);
            // else
                // translateModel(vec3.scale(temp,lookAt,-viewDelta));
            // break;
        // case "KeyO": // translate forward, rotate down with shift
            // if (event.getModifierState("Shift"))
                // rotateModel(viewRight,dirEnum.NEGATIVE);
            // else
                // translateModel(vec3.scale(temp,lookAt,viewDelta));
            // break;
        // case "KeyI": // translate up, rotate counterclockwise with shift 
            // if (event.getModifierState("Shift"))
                // rotateModel(lookAt,dirEnum.POSITIVE);
            // else
                // translateModel(vec3.scale(temp,Up,viewDelta));
            // break;
        // case "KeyP": // translate down, rotate clockwise with shift
            // if (event.getModifierState("Shift"))
                // rotateModel(lookAt,dirEnum.NEGATIVE);
            // else
                // translateModel(vec3.scale(temp,Up,-viewDelta));
            // break;
        // case "Backspace": // reset model transforms to default
            // for (var whichTriSet=0; whichTriSet<numTriangleSets; whichTriSet++) {
                // vec3.set(inputTriangles[whichTriSet].translation,0,0,0);
                // vec3.set(inputTriangles[whichTriSet].xAxis,1,0,0);
                // vec3.set(inputTriangles[whichTriSet].yAxis,0,1,0);
            // } // end for all triangle sets
            // for (var whichSphere=0; whichSphere<numSpheres; whichSphere++) {
                // vec3.set(inputSpheres[whichSphere].translation,0,0,0);
                // vec3.set(inputSpheres[whichTriSet].xAxis,1,0,0);
                // vec3.set(inputSpheres[whichTriSet].yAxis,0,1,0);
            // } // end for all spheres
            // break;
    } // end switch
} // end handleKeyDown

var ctx;
var timeNode;
// set up the webGL environment
function setupWebGL() {
    
    // Set up keys
    document.onkeydown = handleKeyDown; // call this when key pressed
	
	
	
    // look up the text canvas.
    var textCanvas = document.getElementById("text");
    timeNode = document.createTextNode("");
    textCanvas.appendChild(timeNode);
    // make a 2D context for it
    ctx = textCanvas.getContext("2d");

    // Get the image canvas, render an image in it
    var imageCanvas = document.getElementById("myImageCanvas"); // create a 2d canvas
    var cw = imageCanvas.width, ch = imageCanvas.height; 
    imageContext = imageCanvas.getContext("2d"); 
    var bkgdImage = new Image(); 
    bkgdImage.src = "https://ncsucgclass.github.io/prog3/stars.jpg";
    bkgdImage.onload = function(){
        var iw = bkgdImage.width, ih = bkgdImage.height;
        imageContext.drawImage(bkgdImage,0,0,iw,ih,0,0,cw,ch);   
    } // end onload callback
    
    // create a webgl canvas and set it up
    var webGLCanvas = document.getElementById("myWebGLCanvas"); // create a webgl canvas
    gl = webGLCanvas.getContext("webgl"); // get a webgl object from it
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    

    catch(e) {
      console.log(e);
    } // end catch
 

    initSound();
} // end setupWebGL

// read models in, load them into webgl buffers
function loadModels() {
    
    // make a sphere with radius 1 at the origin, with numLongSteps longitudes. 
    // Returns verts, tris and normals.
    function makeSphere(numLongSteps) {
        
        try {
            if (numLongSteps % 2 != 0)
                throw "in makeSphere: uneven number of longitude steps!";
            else if (numLongSteps < 4)
                throw "in makeSphere: number of longitude steps too small!";
            else { // good number longitude steps
            
                // make vertices and normals
                var textureCoordData = [];
                var sphereVertices = [0,-1,0]; // vertices to return, init to south pole
                textureCoordData.push(0.5,1);
                var angleIncr = (Math.PI+Math.PI) / numLongSteps; // angular increment 
                var latLimitAngle = angleIncr * (Math.floor(numLongSteps/4)-1); // start/end lat angle
                var latRadius, latY; // radius and Y at current latitude
                for (var latAngle=-latLimitAngle; latAngle<=latLimitAngle; latAngle+=angleIncr) {
                    latRadius = Math.cos(latAngle); // radius of current latitude
                    latY = Math.sin(latAngle); // height at current latitude
                    for (var longAngle=0; longAngle<2*Math.PI; longAngle+=angleIncr) // for each long
                    {
                        var u =  1-longAngle / (2*Math.PI);
                        var v =  (Math.PI/2 + latAngle)/Math.PI;
                        sphereVertices.push(latRadius*Math.sin(longAngle),latY,latRadius*Math.cos(longAngle));
                        textureCoordData.push(u,v);

                    }   
                } // end for each latitude
                sphereVertices.push(0,1,0); // add north pole
                textureCoordData.push(0.5,0);
                var sphereNormals = sphereVertices.slice(); // for this sphere, vertices = normals; return these

                // make triangles, from south pole to middle latitudes to north pole
                var sphereTriangles = []; // triangles to return
                for (var whichLong=1; whichLong<numLongSteps; whichLong++) // south pole
                    sphereTriangles.push(0,whichLong,whichLong+1);
                sphereTriangles.push(0,numLongSteps,1); // longitude wrap tri
                var llVertex; // lower left vertex in the current quad
                for (var whichLat=0; whichLat<(numLongSteps/2 - 2); whichLat++) { // middle lats
                    for (var whichLong=0; whichLong<numLongSteps-1; whichLong++) {
                        llVertex = whichLat*numLongSteps + whichLong + 1;
                        sphereTriangles.push(llVertex,llVertex+numLongSteps,llVertex+numLongSteps+1);
                        sphereTriangles.push(llVertex,llVertex+numLongSteps+1,llVertex+1);
                    } // end for each longitude
                    sphereTriangles.push(llVertex+1,llVertex+numLongSteps+1,llVertex+2);
                    sphereTriangles.push(llVertex+1,llVertex+2,llVertex-numLongSteps+2);
                } // end for each latitude
                for (var whichLong=llVertex+2; whichLong<llVertex+numLongSteps+1; whichLong++) // north pole
                    sphereTriangles.push(whichLong,sphereVertices.length/3-1,whichLong+1);
                sphereTriangles.push(sphereVertices.length/3-2,sphereVertices.length/3-1,sphereVertices.length/3-numLongSteps-1); // longitude wrap
            } // end if good number longitude steps
            return({vertices:sphereVertices, normals:sphereNormals, triangles:sphereTriangles, textures:textureCoordData});
        } // end try
        
        catch(e) {
            console.log(e);
        } // end catch
    } // end make sphere
    
    inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles"); // read in the triangle data

    try {
        if (inputTriangles == String.null)
            throw "Unable to load triangles file!";
        else {
            var whichSetVert; // index of vertex in current triangle set
            var whichSetTri; // index of triangle in current triangle set
            var vtxToAdd; // vtx coords to add to the coord array
            var normToAdd; // vtx normal to add to the coord array
            var texToAdd = []; //
            var triToAdd; // tri indices to add to the index array
            var maxCorner = vec3.fromValues(Number.MIN_VALUE,Number.MIN_VALUE,Number.MIN_VALUE); // bbox corner
            var minCorner = vec3.fromValues(Number.MAX_VALUE,Number.MAX_VALUE,Number.MAX_VALUE); // other corner
        
            // process each triangle set to load webgl vertex and triangle buffers
            numTriangleSets = inputTriangles.length; // remember how many tri sets
            for (var whichSet=0; whichSet<numTriangleSets; whichSet++) { // for each tri set
                
                // set up hilighting, modeling translation and rotation
                inputTriangles[whichSet].center = vec3.fromValues(0,0,0);  // center point of tri set
                inputTriangles[whichSet].on = false; // not highlighted
                inputTriangles[whichSet].translation = vec3.fromValues(0,0,0); // no translation
                inputTriangles[whichSet].xAxis = vec3.fromValues(1,0,0); // model X axis
                inputTriangles[whichSet].yAxis = vec3.fromValues(0,1,0); // model Y axis 

                initTexture(inputTriangles[whichSet].material.texture,whichSet);    
                // set up the vertex and normal arrays, define model center and axes
                inputTriangles[whichSet].glVertices = []; // flat coord list for webgl
                inputTriangles[whichSet].glNormals = []; // flat normal list for webgl

                inputTriangles[whichSet].textureCoords = []; //

                var numVerts = inputTriangles[whichSet].vertices.length; // num vertices in tri set
                for (whichSetVert=0; whichSetVert<numVerts; whichSetVert++) { // verts in set
                    vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert]; // get vertex to add
                    texToAdd = inputTriangles[whichSet].uvs[whichSetVert];
                    normToAdd = inputTriangles[whichSet].normals[whichSetVert]; // get normal to add
                    inputTriangles[whichSet].textureCoords.push(texToAdd[0],texToAdd[1]);
                    inputTriangles[whichSet].glVertices.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]); // put coords in set coord list
                    inputTriangles[whichSet].glNormals.push(normToAdd[0],normToAdd[1],normToAdd[2]); // put normal in set coord list
                    vec3.max(maxCorner,maxCorner,vtxToAdd); // update world bounding box corner maxima
                    vec3.min(minCorner,minCorner,vtxToAdd); // update world bounding box corner minima
                    vec3.add(inputTriangles[whichSet].center,inputTriangles[whichSet].center,vtxToAdd); // add to ctr sum
                } // end for vertices in set
                vec3.scale(inputTriangles[whichSet].center,inputTriangles[whichSet].center,1/numVerts); // avg ctr sum

                // send the vertex coords and normals to webGL
                vertexBuffers[whichSet] = gl.createBuffer(); // init empty webgl set vertex coord buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].glVertices),gl.STATIC_DRAW); // data in
                normalBuffers[whichSet] = gl.createBuffer(); // init empty webgl set normal component buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].glNormals),gl.STATIC_DRAW); // data in
                textureBuffers[whichSet] = gl.createBuffer(); // init empty webgl set normal component buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,textureBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].textureCoords),gl.STATIC_DRAW); // data in
            
                // set up the triangle index array, adjusting indices across sets
                inputTriangles[whichSet].glTriangles = []; // flat index list for webgl
                triSetSizes[whichSet] = inputTriangles[whichSet].triangles.length; // number of tris in this set
                for (whichSetTri=0; whichSetTri<triSetSizes[whichSet]; whichSetTri++) {
                    triToAdd = inputTriangles[whichSet].triangles[whichSetTri]; // get tri to add
                    inputTriangles[whichSet].glTriangles.push(triToAdd[0],triToAdd[1],triToAdd[2]); // put indices in set list
                } // end for triangles in set

                // send the triangle indices to webGL
                triangleBuffers.push(gl.createBuffer()); // init empty triangle index buffer
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(inputTriangles[whichSet].glTriangles),gl.STATIC_DRAW); // data in

            } // end for each triangle set 
        
            inputSpheres = getJSONFile(INPUT_SPHERES_URL,"spheres"); // read in the sphere data

            if (inputSpheres == String.null)
                throw "Unable to load spheres file!";
            else {
                
                // init sphere highlighting, translation and rotation; update bbox
                var sphere; // current sphere
                var temp = vec3.create(); // an intermediate vec3
                var minXYZ = vec3.create(), maxXYZ = vec3.create();  // min/max xyz from sphere
                numSpheres = inputSpheres.length; // remember how many spheres
                for (var whichSphere=0; whichSphere<numSpheres; whichSphere++) {
                    sphere = inputSpheres[whichSphere];
                    sphere.on = false; // spheres begin without highlight
                    initSphereTexture(sphere.texture,whichSphere);
                    console.log(sphere.texture);
                    sphere.translation = vec3.fromValues(0,0,0); // spheres begin without translation
                    sphere.xAxis = vec3.fromValues(1,0,0); // sphere X axis
                    sphere.yAxis = vec3.fromValues(0,1,0); // sphere Y axis 
                    sphere.center = vec3.fromValues(0,0,0); // sphere instance is at origin
                    vec3.set(minXYZ,sphere.x-sphere.r,sphere.y-sphere.r,sphere.z-sphere.r); 
                    vec3.set(maxXYZ,sphere.x+sphere.r,sphere.y+sphere.r,sphere.z+sphere.r); 
                    vec3.min(minCorner,minCorner,minXYZ); // update world bbox min corner
                    vec3.max(maxCorner,maxCorner,maxXYZ); // update world bbox max corner
                } // end for each sphere
                viewDelta = vec3.length(vec3.subtract(temp,maxCorner,minCorner)) / 200; // set global

                // make one sphere instance that will be reused
                var oneSphere = makeSphere(32);

                // send the sphere vertex coords and normals to webGL
                vertexBuffers.push(gl.createBuffer()); // init empty webgl sphere vertex coord buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[vertexBuffers.length-1]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(oneSphere.vertices),gl.STATIC_DRAW); // data in
                normalBuffers.push(gl.createBuffer()); // init empty webgl sphere vertex normal buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[normalBuffers.length-1]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(oneSphere.normals),gl.STATIC_DRAW); // data in
                textureBuffers.push(gl.createBuffer()); // init empty webgl sphere vertex normal buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,textureBuffers[textureBuffers.length-1]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(oneSphere.textures),gl.STATIC_DRAW); // data in

                triSetSizes.push(oneSphere.triangles.length);

                // send the triangle indices to webGL
                triangleBuffers.push(gl.createBuffer()); // init empty triangle index buffer
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[triangleBuffers.length-1]); // activate that buffer
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(oneSphere.triangles),gl.STATIC_DRAW); // data in
            } // end if sphere file loaded
        } // end if triangle file loaded
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch

    playSound("mainTheme",true);
} // end load models

// setup the webGL shaders
function setupShaders() {
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 aVertexPosition; // vertex position
        attribute vec3 aVertexNormal; // vertex normal
        attribute vec2 aTextureCoord;

        uniform mat4 umMatrix; // the model matrix
        uniform mat4 upvmMatrix; // the project view model matrix
        
        varying vec3 vWorldPos; // interpolated world position of vertex
        varying vec3 vVertexNormal; // interpolated normal for frag shader

        varying vec2 vTextureCoord;

        void main(void) {
            
            // vertex position
            vec4 vWorldPos4 = umMatrix * vec4(aVertexPosition, 1.0);
            vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
            gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);

            // vertex normal (assume no non-uniform scale)
            vec4 vWorldNormal4 = umMatrix * vec4(aVertexNormal, 0.0);
            vVertexNormal = normalize(vec3(vWorldNormal4.x,vWorldNormal4.y,vWorldNormal4.z)); 
            vTextureCoord = aTextureCoord;
        }
    `;
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float; // set float to medium precision

        // eye location
        uniform vec3 uEyePosition; // the eye's position in world
        
        // light properties
        uniform vec3 uLightAmbient; // the light's ambient color
        uniform vec3 uLightDiffuse; // the light's diffuse color
        uniform vec3 uLightSpecular; // the light's specular color
        uniform vec3 uLightPosition; // the light's position
        
        // material properties
        uniform vec3 uAmbient; // the ambient reflectivity
        uniform vec3 uDiffuse; // the diffuse reflectivity
        uniform vec3 uSpecular; // the specular reflectivity
        uniform float uShininess; // the specular exponent
        
        // geometry properties
        varying vec3 vWorldPos; // world xyz of fragment
        varying vec3 vVertexNormal; // normal of fragment
            
        varying vec2 vTextureCoord; 
        uniform float uAlpha;
        uniform int isTexture;     

        uniform sampler2D uSampler;
        void main(void) {
        
            // ambient term
            vec3 ambient = uAmbient*uLightAmbient; 
            
            // diffuse term
            vec3 normal = normalize(vVertexNormal); 
            vec3 light = normalize(uLightPosition - vWorldPos);
            float lambert = max(0.0,dot(normal,light));
            vec3 diffuse = uDiffuse*uLightDiffuse*lambert; // diffuse term
            
            // specular term
            vec3 eye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(light+eye);
            float highlight = pow(max(0.0,dot(normal,halfVec)),uShininess);
            vec3 specular = uSpecular*uLightSpecular*highlight; // specular term
            
            vec4 fragmentColor;    
            // combine to output color
            vec3 colorOut = ambient + diffuse + specular; // no specular yet
            if(isTexture==1)
            {
                fragmentColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));
                gl_FragColor = vec4(fragmentColor.rgb * colorOut, fragmentColor.a * uAlpha); 
            }
            else
            {
                gl_FragColor = vec4(colorOut, 1.0 * uAlpha); 
            }
        }
    `;
    
    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                
                // locate and enable vertex attributes
                vPosAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition"); // ptr to vertex pos attrib
                gl.enableVertexAttribArray(vPosAttribLoc); // connect attrib to array
                vNormAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexNormal"); // ptr to vertex normal attrib
                gl.enableVertexAttribArray(vNormAttribLoc); // connect attrib to array
                textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
                gl.enableVertexAttribArray(textureCoordAttribute);
                
                // locate vertex uniforms
                mMatrixULoc = gl.getUniformLocation(shaderProgram, "umMatrix"); // ptr to mmat
                pvmMatrixULoc = gl.getUniformLocation(shaderProgram, "upvmMatrix"); // ptr to pvmmat
                
                // locate fragment uniforms
                var eyePositionULoc = gl.getUniformLocation(shaderProgram, "uEyePosition"); // ptr to eye position
                var lightAmbientULoc = gl.getUniformLocation(shaderProgram, "uLightAmbient"); // ptr to light ambient
                var lightDiffuseULoc = gl.getUniformLocation(shaderProgram, "uLightDiffuse"); // ptr to light diffuse
                var lightSpecularULoc = gl.getUniformLocation(shaderProgram, "uLightSpecular"); // ptr to light specular
                var lightPositionULoc = gl.getUniformLocation(shaderProgram, "uLightPosition"); // ptr to light position
                ambientULoc = gl.getUniformLocation(shaderProgram, "uAmbient"); // ptr to ambient
                diffuseULoc = gl.getUniformLocation(shaderProgram, "uDiffuse"); // ptr to diffuse
                specularULoc = gl.getUniformLocation(shaderProgram, "uSpecular"); // ptr to specular
                shininessULoc = gl.getUniformLocation(shaderProgram, "uShininess"); // ptr to shininess
                samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
                alphaUniform = gl.getUniformLocation(shaderProgram, "uAlpha");
                isTextureUniform = gl.getUniformLocation(shaderProgram, "isTexture");
                
                // pass global constants into fragment uniforms
                gl.uniform3fv(eyePositionULoc,Eye); // pass in the eye's position
                gl.uniform3fv(lightAmbientULoc,lightAmbient); // pass in the light's ambient emission
                gl.uniform3fv(lightDiffuseULoc,lightDiffuse); // pass in the light's diffuse emission
                gl.uniform3fv(lightSpecularULoc,lightSpecular); // pass in the light's specular emission
                gl.uniform3fv(lightPositionULoc,lightPosition); // pass in the light's position
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

// render the loaded model
function renderModels() {
    
    // construct the model transform matrix, based on model state
    function makeModelTransform(currModel) {
        var zAxis = vec3.create(), sumRotation = mat4.create(), temp = mat4.create(), negCenter = vec3.create();

        vec3.normalize(zAxis,vec3.cross(zAxis,currModel.xAxis,currModel.yAxis)); // get the new model z axis
        mat4.set(sumRotation, // get the composite rotation
            currModel.xAxis[0], currModel.yAxis[0], zAxis[0], 0,
            currModel.xAxis[1], currModel.yAxis[1], zAxis[1], 0,
            currModel.xAxis[2], currModel.yAxis[2], zAxis[2], 0,
            0, 0,  0, 1);
        vec3.negate(negCenter,currModel.center);
        mat4.multiply(sumRotation,sumRotation,mat4.fromTranslation(temp,negCenter)); // rotate * -translate
        mat4.multiply(sumRotation,mat4.fromTranslation(temp,currModel.center),sumRotation); // translate * rotate * -translate


        mat4.fromTranslation(mMatrix,currModel.translation); // translate in model matrix
        mat4.multiply(mMatrix,mMatrix,sumRotation); // rotate in model matrix
    } // end make model transform
    
    var hMatrix = mat4.create(); // handedness matrix
    var pMatrix = mat4.create(); // projection matrix
    var vMatrix = mat4.create(); // view matrix
    var mMatrix = mat4.create(); // model matrix
    var hpvMatrix = mat4.create(); // hand * proj * view matrices
    var hpvmMatrix = mat4.create(); // hand * proj * view * model matrices
    const highlightMaterial = {ambient:[0.5,0.5,0], diffuse:[0.5,0.5,0], specular:[0,0,0], n:1}; // hlht mat
    
    window.requestAnimationFrame(renderModels); // set up frame render callbacks
    
    gl.clear(/*gl.COLOR_BUFFER_BIT |*/ gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    
    // set up handedness, projection and view
    mat4.fromScaling(hMatrix,vec3.fromValues(-1,1,1)); // create handedness matrix
    mat4.perspective(pMatrix,0.5*Math.PI,1,0.1,20); // create projection matrix
    mat4.lookAt(vMatrix,Eye,Center,Up); // create view matrix
    mat4.multiply(hpvMatrix,hMatrix,pMatrix); // handedness * projection
    mat4.multiply(hpvMatrix,hpvMatrix,vMatrix); // handedness * projection * view

    // render each triangle set
    var currSet, setMaterial; // the tri set and its material properties
    for (var whichTriSet=0; whichTriSet<numTriangleSets; whichTriSet++) {
        currSet = inputTriangles[whichTriSet];
        
        // make model transform, add to view project
        makeModelTransform(currSet);
        mat4.multiply(hpvmMatrix,hpvMatrix,mMatrix); // handedness * project * view * model
        gl.uniformMatrix4fv(mMatrixULoc, false, mMatrix); // pass in the m matrix
        gl.uniformMatrix4fv(pvmMatrixULoc, false, hpvmMatrix); // pass in the hpvm matrix
        
        // reflectivity: feed to the fragment shader
        if (inputTriangles[whichTriSet].on)
            setMaterial = highlightMaterial; // highlight material
        else
            setMaterial = currSet.material; // normal material
        gl.uniform3fv(ambientULoc,setMaterial.ambient); // pass in the ambient reflectivity
        gl.uniform3fv(diffuseULoc,setMaterial.diffuse); // pass in the diffuse reflectivity
        gl.uniform3fv(specularULoc,setMaterial.specular); // pass in the specular reflectivity
        gl.uniform1f(shininessULoc,setMaterial.n); // pass in the specular exponent
        
        // vertex buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichTriSet]); // activate
        gl.vertexAttribPointer(vPosAttribLoc,3,gl.FLOAT,false,0,0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichTriSet]); // activate
        gl.vertexAttribPointer(vNormAttribLoc,3,gl.FLOAT,false,0,0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER,textureBuffers[whichTriSet]); // activate
        gl.vertexAttribPointer(textureCoordAttribute,2,gl.FLOAT,false,0,0); // feed

        gl.uniform1f(alphaUniform, inputTriangles[whichTriSet].material.alpha);
        // console.log(inputTriangles[whichTriSet].material.texture);
        if(inputTriangles[whichTriSet].material.texture)
        {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, kpTexture[whichTriSet]);
            gl.uniform1i(samplerUniform, 0);
            gl.uniform1i(isTextureUniform, 1);
        }
        else
        {
            gl.uniform1i(isTextureUniform, 0);   
        }

        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[whichTriSet]); // activate
        gl.drawElements(gl.TRIANGLES,3*triSetSizes[whichTriSet],gl.UNSIGNED_SHORT,0); // render
        
    } // end for each triangle set
    
    // render each sphere
    var sphere, currentMaterial, instanceTransform = mat4.create(); // the current sphere and material
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[vertexBuffers.length-1]); // activate vertex buffer
    gl.vertexAttribPointer(vPosAttribLoc,3,gl.FLOAT,false,0,0); // feed vertex buffer to shader
    gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[normalBuffers.length-1]); // activate normal buffer
    gl.vertexAttribPointer(vNormAttribLoc,3,gl.FLOAT,false,0,0); // feed normal buffer to shader
    gl.bindBuffer(gl.ARRAY_BUFFER,textureBuffers[textureBuffers.length-1]); // activate vertex buffer
    gl.vertexAttribPointer(textureCoordAttribute,2,gl.FLOAT,false,0,0); // feed vertex buffer to shader
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[triangleBuffers.length-1]); // activate tri buffer
    
    for (var whichSphere=0; whichSphere<numSpheres; whichSphere++) {
        sphere = inputSpheres[whichSphere];
        
        // define model transform, premult with pvmMatrix, feed to shader
        makeModelTransform(sphere);

        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // gl.enable(gl.BLEND);
        // gl.depthMask(false);
        gl.uniform1f(alphaUniform, sphere.alpha);
        if(sphere.texture)
        {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, skpTexture[whichSphere]);
            gl.uniform1i(samplerUniform, 0)            
            gl.uniform1i(isTextureUniform, 1);
        }
        else
        {
            gl.uniform1i(isTextureUniform, 0);   
        }

        var sphere_center = vec3.create(), sphere_bottom = vec3.create(); sphere_front = vec3.create();sphere_left = vec3.create();sphere_right = vec3.create();       
        sphere_center = vec3.add(sphere_center,sphere.translation,vec3.fromValues(sphere.x,sphere.y,sphere.z));        
        sphere_bottom = vec3.add(sphere_bottom,sphere.translation,vec3.fromValues(sphere.x, -sphere.r,sphere.z));
        sphere_front = vec3.add(sphere_front,sphere.translation,vec3.fromValues(sphere.x,sphere.y,sphere.z+sphere.r));        
        sphere_left = vec3.add(sphere_left,sphere.translation,vec3.fromValues(sphere.x-sphere.r,sphere.y,sphere.z));        
        sphere_right = vec3.add(sphere_right,sphere.translation,vec3.fromValues(sphere.x+sphere.r,sphere.y,sphere.z));        

        var lookAt = vec3.create(), viewRight = vec3.create(), temp = vec3.create(); // lookat, right & temp vectors
        lookAt = vec3.normalize(lookAt,vec3.subtract(temp,Center,Eye)); // get lookat vector
        viewRight = vec3.normalize(viewRight,vec3.cross(temp,lookAt,Up)); // get view right vector
        Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,velocity));
        Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,velocity));
        lightPosition = vec3.add(lightPosition,lightPosition,vec3.scale(temp,lookAt,velocity));
        // console.log("Light: ", lightPosition);
        // console.log("Eye: ", Eye);
        // to be applied to spaceship patterns
        // console.log("HELOOOOOOO");
        // if(future_collision!=1)
        vec3.add(sphere.translation,sphere.translation,vec3.scale(temp,lookAt,velocity));   

        if(spaceJump==1 && spaceJumpCounter<jumpTime)
        {
            var v;
            v = jumpVelocity - gravity * spaceJumpCounter;
            spaceJumpCounter = spaceJumpCounter + jumpTime/10;
            // translateModel(vec3.scale(temp,Up,viewDelta));
            vec3.add(sphere.translation,sphere.translation,vec3.scale(temp,Up,v));   
        }
        else if(spaceJumpCounter>jumpTime)
        {
            sphere_bottom = vec3.add(sphere_bottom,sphere.translation,vec3.fromValues(sphere.x,sphere.y-sphere.r,sphere.z));
            var surface = get_surface_level(sphere_bottom, inputTriangles,sphere);
            time = Math.sqrt(2 *(sphere_bottom[1]-surface)/gravity);
            freeFallTime=0;

            spaceJump=0;
            spaceJumpCounter=0;
            freefall_velocity=0;
            // freefall_flag=1;
        }

        var surface = get_surface_level(sphere_bottom, inputTriangles,sphere);
        if(time=-1)
        {
            time = Math.sqrt(2 *(sphere_bottom[1]-(-1))/gravity);
            // freeFallTime=
        }
        // console.log("surface : ",surface);
        // console.log("freeFallTime : ",surface);

        // console.log("bottom y coordinate :", sphere_bottom[1]);
        // console.log("surface:",surface);
        // console.log
        // console.log("b:", sphere_bottom[1]);
        // console.log("s:",surface);
        // console.log("t:",sphere.translation[1]);    
        // emulate freefall
        if(sphere_bottom[1]-surface>0.0001 && spaceJump==0 && freeFallTime < time)
        {
            // console.log("hello");
            var v=0;
            v = freefall_velocity - gravity * freeFallTime;
            freeFallTime = freeFallTime + time/20;   
            {
                var a = vec3.create();
                vec3.add(sphere.translation,sphere.translation,vec3.scale(temp,Up,v));      
                a=vec3.add(a,sphere.translation,vec3.fromValues(sphere.x,sphere.y-sphere.r,sphere.z));
                freefall_flag=1;
            }
        }
        else if(freefall_flag==1)
        {
            // console.log("b:", sphere_bottom[1]);
            // console.log("s:",surface);
            sphere.translation[1]=surface+sphere.r-sphere.y;
            // console.log("t:",sphere.translation[1]);
            freefall_flag=0;
            freeFallTime=0;
        }

        // side shift 
        var side_surface;
        if(left==1 && right==0)
        {
            side_surface = get_side_surface_level(sphere_left, inputTriangles, right); // right = 1 for left
        }
        else if(right==1 && left ==0)
            side_surface = get_side_surface_level(sphere_right, inputTriangles, right); // right = 0 for right
        if(sideJump==1 && sideJumpCounter<sidejumpTime)
        {
            var v;
            v = sidejumpVelocity - sidegravity * sideJumpCounter;
            sideJumpCounter = sideJumpCounter + sidejumpTime/10;
            // translateModel(vec3.scale(temp,Up,viewDelta));

            var sidetemp = vec3.create(), temp2 = vec3.create();
            if(left == 1 && right==0)
            {
                console.log("going left");
                 console.log(side_surface);
                vec3.add(sidetemp,sphere.translation,vec3.scale(temp,viewRight,v));
                temp2 = vec3.add(sphere_left,sidetemp,vec3.fromValues(sphere.x-sphere.r,sphere.y,sphere.z));        
                // console.log(sidetemp[0]);
                if(side_surface < temp2[0])   
                    vec3.add(sphere.translation,sphere.translation,vec3.scale(temp,viewRight,v));   
                else
                    left=0;
            }
            else if(right==1 && left ==0)
            {
                console.log("going right");
                 console.log(side_surface);
                vec3.add(sidetemp,sphere.translation,vec3.scale(temp,viewRight,-v));   
                // console.log(sidetemp[0]);
                temp2 = vec3.add(sphere_right,sidetemp,vec3.fromValues(sphere.x+sphere.r,sphere.y,sphere.z));        
                if(side_surface > temp2[0])
                    vec3.add(sphere.translation,sphere.translation,vec3.scale(temp,viewRight,-v));   
                else
                    right=0;
            }
        }
        else if(sideJumpCounter>sidejumpTime)
        {
            // sphere_bottom = vec3.add(sphere_bottom,sphere.translation,vec3.fromValues(sphere.x,sphere.y-sphere.r,sphere.z));
            // var surface = get_surface_level(sphere_bottom, inputTriangles);
            // time = Math.sqrt(2 *(sphere_bottom[1]-surface)/gravity);
            // freeFallTime=0;
            left=0;
            right=0;
            sideJump=0;
            sideJumpCounter=0;
            // freefall_velocity=0;
            // freefall_flag=1;
        }



        // predict future front collision 
        var front_collision = check_Dead_or_Alive(sphere_front,sphere_center,inputTriangles);
        if(check_collision(sphere_front,sphere_center,inputTriangles)!=0)
        {
            // console.log("Its collided now");
            future_collision=1; // well, actually its in the present           
        }
        
        if(front_collision!=0)
        {   
            var nextZ = vec3.create();
            var temp = vec3.create();
            var v = velocity ; // worked for acc = 0.003 and able to predict 3.6 ahead.
            vec3.add(nextZ,sphere.translation,vec3.scale(temp,lookAt,v));
            vec3.add(temp,nextZ,vec3.fromValues(sphere.x,sphere.y,sphere.z+sphere.r));        

            // console.log("Future collision");
            // console.log("sphere_front_now: ",sphere.z+sphere.translation[2]+sphere.r);
            // console.log("front Collision: ",front_collision);
            // console.log("sphere_front_later: ",temp[2]);

            if(temp[2] > front_collision && front_collision > sphere_front[2])
            {
                console.log("Future collision");
                future_collision=1;   
                sphere.translation[2] = front_collision - sphere.z - sphere.r;
            }
            // console.log(future_collision);
        }
        // console.log(s)

        // console.log(vec3.add(temp,sphere.translation,vec3.fromValues(sphere.x,sphere.y,sphere.z)));
        mat4.fromTranslation(instanceTransform,vec3.fromValues(sphere.x,sphere.y,sphere.z)); // recenter sphere
        mat4.scale(mMatrix,mMatrix,vec3.fromValues(sphere.r,sphere.r,sphere.r)); // change size
        mat4.multiply(mMatrix,instanceTransform,mMatrix); // apply recenter sphere
        hpvmMatrix = mat4.multiply(hpvmMatrix,hpvMatrix,mMatrix); // premultiply with hpv matrix
        gl.uniformMatrix4fv(mMatrixULoc, false, mMatrix); // pass in model matrix
        gl.uniformMatrix4fv(pvmMatrixULoc, false, hpvmMatrix); // pass in handed project view model matrix

        // reflectivity: feed to the fragment shader
        // if (sphere.on)
        //     currentMaterial = highlightMaterial;
        // else
            currentMaterial = sphere;
        gl.uniform3fv(ambientULoc,currentMaterial.ambient); // pass in the ambient reflectivity
        gl.uniform3fv(diffuseULoc,currentMaterial.diffuse); // pass in the diffuse reflectivity
        gl.uniform3fv(specularULoc,currentMaterial.specular); // pass in the specular reflectivity
        gl.uniform1f(shininessULoc,currentMaterial.n); // pass in the specular exponent

        // draw a transformed instance of the sphere
        gl.drawElements(gl.TRIANGLES,triSetSizes[triSetSizes.length-1],gl.UNSIGNED_SHORT,0); // render
        
        var display_score=0;
        if(level_transition!=1)
        {
            score=Math.ceil(Eye[2]+1);
            fuel_level = fuel_level-0.002;
            display_score = current_score+score;
        }
            oxygen_level=oxygen_level-0.001;
        
        var vel_now = velocity*100;
        var current_level = level_completed+1;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '15pt Calibri';
        ctx.fillStyle = 'white';
        ctx.fillText("Score :"+display_score, 5, 20);
        ctx.fillText("HighScore :"+HighScore,330,20);
        ctx.fillText("Velocity :"+vel_now.toFixed(2),5,40);
        ctx.fillText("Level :"+current_level,210,480);
        ctx.fillText("Oxygen : "+oxygen_level.toFixed(0),2,60);
        ctx.fillText("Fuel : "+fuel_level.toFixed(0),2,80);

        if(level_transition==1)
        {   
            if(temp_peak_velocity>0)
            {
                // console.log("pappa");
                // console.log(temp_peak_velocity);
                level_transition=0;
                Eye[2]=defaultEye[2];
                Center[2]=defaultCenter[2];
                temp_peak_velocity=0;
                transition_init_flag=0;
                // console.log(Eye);
            }   
            else if(transition_init_flag==0)
            {
                // console.log("pappu");
                var offset = vec3.fromValues(20,0,0);
                Center = vec3.add(Center,defaultCenter,vec3.scale(offset,offset,level_completed)); 
                Eye = vec3.add(Eye,defaultEye,offset);
                Eye[2]=Eye[2]+250;
                Center[2]=Center[2]+250;
                transition_init_flag=1;
            }
            else
            {
                var v,temp;
                
                if(transitionCounter<0.345)
                {
                    v = -transition_acceleration*transitionCounter;
                }
                else{
                    // console.log("Haaloo ");
                    v =  -2 + transition_acceleration*(transitionCounter-0.345);
                     
                }
                // console.log(oxygen);
                    temp_peak_velocity=v;
                transitionCounter = transitionCounter + transition_time/10000;
                console.log("velocity :",v );
                console.log("temp peak: ", temp_peak_velocity);
                console.log("time: ", transitionCounter);
                vec3.add(Eye,Eye,vec3.scale(temp,lookAt,v));   
                vec3.add(Center,Center,vec3.scale(temp,lookAt,v));
            }

        }
        else if(sphere_center[1] < 0 ||future_collision||oxygen_level==0||fuel_level==0)
        {
            if(score+current_score > HighScore)
            {
                HighScore = current_score+score;
                // window.alert("New High Score:"+score);
            }
            
            if(Eye[2] >= 250)
            {
                current_score = current_score+score; 
                level_completed=level_completed+1; // add +1 till 10
                // console.log(level_completed);
                var offset = vec3.fromValues(20,0,0);
                if(level_completed<NUMBER_OF_LEVELS)
                {
                    sphere.translation = vec3.add(sphere.translation,vec3.fromValues(0,0,0),vec3.scale(offset,offset,level_completed));
                    level_transition=1;
                    // Center = vec3.add(Center,defaultCenter,offset); 
                    // Eye = vec3.add(Eye,defaultEye,offset);
                    velocity=0;
					document.getElementById("status").innerHTML = "THE FORCE IS STRONG WITH YOU. LEVEL COMPLETED";
                    //window.alert("LEVEL COMPLETED");   
                }
                else
                    //window.alert("GAME COMPLETED");      
				document.getElementById("status").innerHTML = "THE DEATH STAR HAS BEEN DESTROYED. GAME COMPLETED";

            }   
            else
            {
                restart_level(sphere);
                restart=0;
                future_collision=0;
                window.alert("TRY AGAIN");
				document.getElementById("status").innerHTML = "YOU DON'T HAVE CONTROL OVER THE FORCE. TRY AGAIN";
            }
        }

    } // end for each sphere
} // end render model

var oxygen_level=100;
var fuel_level=200;

var freefall_flag=0;
var time=-1;
var future_collision=0;
var restart=0;
var level_completed=0;
var current_score=0;
var level_transition=0;
var transition_velocity = 60;
var transition_time = 110;
var transition_acceleration = 5.6;
var transition_init_flag=0;
var transitionCounter=0;
var temp_peak_velocity=0;
function get_surface_level(sphere_bottom, inputTriangles,sphere)
{
    var length = inputTriangles.length;
    var surface= -1;

    for(var i = 0; i < length; i++)
    {
        // console.log(sphere_bottom[2]," ", inputTriangles[i].limitbaseZ[0]);
        if(sphere_bottom[2] > inputTriangles[i].limitbaseZ[0] && sphere_bottom[2] < inputTriangles[i].limitbaseZ[1])
        {
            // console.log("NUSM");
            if((sphere_bottom[0]+sphere.r/3) > inputTriangles[i].limitbaseX[0] && (sphere_bottom[0]-sphere.r/3) < inputTriangles[i].limitbaseX[1])
            {
                    // console.log(inputTriangles[i].id);
                if(surface < inputTriangles[i].surfaceHeight)
                {
                    surface = inputTriangles[i].surfaceHeight;
                }
            }   
        }            
    }
    // console.log("surface : ",surface);
    return surface;
}

function get_side_surface_level(sphere_side, inputTriangles, side)
{
    var length = inputTriangles.length;
    var surface;
    if(side==0)
        surface= -10;
    else if(side ==1)
        surface = 10*NUMBER_OF_LEVELS+100; // greater than all edges to the right

    for(var i = 0; i < length; i++)
    {
        if(sphere_side[2] > inputTriangles[i].limitbaseZ[0] && sphere_side[2] < inputTriangles[i].limitbaseZ[1])
        {
            if(sphere_side[1] > inputTriangles[i].limitbaseY[0] && sphere_side[1] < inputTriangles[i].limitbaseY[1])
            {
                if(side == 0 && surface < inputTriangles[i].surfaceLeftRightFront[1] && sphere_side[0] > inputTriangles[i].surfaceLeftRightFront[1])
                {
                    surface = inputTriangles[i].surfaceLeftRightFront[1];
                    // console.log(inputTriangles[i].id);
                }
                else if(side == 1 && surface > inputTriangles[i].surfaceLeftRightFront[0] && sphere_side[0] < inputTriangles[i].surfaceLeftRightFront[0])
                {
                    surface = inputTriangles[i].surfaceLeftRightFront[0];
                }
            }


        }            
    }
    // console.log("surface : ",surface);
    return surface;   
}

var ship_Z_before;
function check_Dead_or_Alive(sphere_front,sphere_center, inputTriangles)
{
    var length = inputTriangles.length;
    var closest_surface = 400;
    // console.log("sphere_front",sphere_front);
    for(var i = 0; i < length; i++)
    {
        // console.log(sphere_bottom[2]," ", inputTriangles[i].limitbaseZ[0]);
        if(sphere_front[1] > inputTriangles[i].limitbaseY[0] && sphere_front[1] < inputTriangles[i].limitbaseY[1])
        {
            // console.log("NUSM");
            if(sphere_front[0] > inputTriangles[i].limitbaseX[0] && sphere_front[0] < inputTriangles[i].limitbaseX[1])
             {
            //     // console.log("id :",inputTriangles[i].id);
            //     // console.log("center",sphere_center[2]);
            //     // console.log("Z obj", inputTriangles[i].surfaceLeftRightFront[2]);
                if(closest_surface > inputTriangles[i].surfaceLeftRightFront[2])
                {
                    closest_surface = inputTriangles[i].surfaceLeftRightFront[2];
                }
             }
            // // spaceship too fast
            // else if(ship_Z_before < inputTriangles[i].surfaceLeftRightFront[2] && sphere_center[2] > inputTriangles[i].surfaceLeftRightFront[2])
            // {
            //     return inputTriangles[i].surfaceLeftRightFront[2];
            // }
        }            
    }
    // console.log("surface : ",surface);
    ship_Z_before=sphere_center[2];
    if(closest_surface!=400)
        return closest_surface;
    else
        return 0;       
}

function check_collision(sphere_front,sphere_center, inputTriangles)
{
    var length = inputTriangles.length;
    // console.log("sphere_front",sphere_front);
    for(var i = 0; i < length; i++)
    {
        // console.log(sphere_bottom[2]," ", inputTriangles[i].limitbaseZ[0]);
        if(sphere_front[1] > inputTriangles[i].limitbaseY[0] && sphere_front[1] < inputTriangles[i].limitbaseY[1])
        {
            // console.log("NUSM");
            if(sphere_front[0] > inputTriangles[i].limitbaseX[0] && sphere_front[0] < inputTriangles[i].limitbaseX[1])
            {
                // console.log("id :",inputTriangles[i].id);
                // console.log("center",sphere_center[2]);
                // console.log("Z obj", inputTriangles[i].surfaceLeftRightFront[2]);
                if(sphere_front[2] > inputTriangles[i].surfaceLeftRightFront[2] && sphere_center[2] < inputTriangles[i].surfaceLeftRightFront[2])
                {
                    return inputTriangles[i].surfaceLeftRightFront[2];
                }
            }
            // spaceship too fast
            // else if(ship_Z_before < inputTriangles[i].surfaceLeftRightFront[2] && sphere_center[2] > inputTriangles[i].surfaceLeftRightFront[2])
            // {
            //     return inputTriangles[i].surfaceLeftRightFront[2];
            // }
        }            
    }
    // console.log("surface : ",surface);
    // ship_Z_before=sphere_center[2];
    return 0;       

}

function restart_level(sphere)
{
    Eye = vec3.fromValues(Eye[0],defaultEye[1],defaultEye[2]); // eye position in world space
    Center = vec3.fromValues(Center[0],defaultCenter[1],defaultCenter[2]); // view direction in world space
    Up = vec3.clone(defaultUp); // view up vector in world space
    Score=0;
    var offset = vec3.fromValues(20*level_completed,0,0);
    sphere.translation = vec3.add(sphere.translation,vec3.fromValues(0,0,0),offset); 
    velocity=0;
}

/* MAIN -- HERE is where execution begins after window load */

function main() {
  
  setupWebGL(); // set up the webGL environment
  loadModels(); // load in the models from tri file
  setupShaders(); // setup the webGL shaders
  renderModels(); // draw the triangles using webGL
   // Clear the 2D canvas
    
} // end main



function initTexture(texture_path,whichSet) 
{
    kpTexture[whichSet] = gl.createTexture();
    kpTexture[whichSet].image = new Image();    
    kpTexture[whichSet].image.crossOrigin = ''; 
    kpTexture[whichSet].image.onload = function () 
    {
        handleLoadedTexture(kpTexture[whichSet])
    }
    if(texture_path)
        kpTexture[whichSet].image.src = "https://kspatil2.github.io/" + texture_path;
    console.log("Hello : ",texture_path);
}

function initSphereTexture(texture_path,whichSet) 
{
    skpTexture[whichSet] = gl.createTexture();
    skpTexture[whichSet].image = new Image();    
    skpTexture[whichSet].image.crossOrigin = ''; 
    skpTexture[whichSet].image.onload = function () 
    {
        handleLoadedTexture(skpTexture[whichSet])
    }
    if(texture_path)
        skpTexture[whichSet].image.src = "https://kspatil2.github.io/" + texture_path;
    console.log(texture_path);
}

var kpTexture = [];
var skpTexture = [];
function handleLoadedTexture(texture) 
{
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // var texture = gl.createTexture();
    // gl.bindTexture(gl.TEXTURE_2D, texture);
    
}
var sound =[];
function initSound()
{
    sound.push(new Audio("./Sound/dp_starwars_darkside.mp3"));
    sound.push(new Audio("./Sound/dp_starwars_theme.mp3"));
}

function playSound(id,flag)
{
    switch(id)
    {
        case "mainTheme": sound[0].loop = flag; sound[0].play(); break;
        case "jump": sound[1].play(); break;
    }

}

//stop
function stopSound(id)
{
    switch(id)
    {
        case "mainTheme": sound[0].pause();sound.currentTime=0 ; break;
        case "jump": sound[1].pause(); break;
    }    
}