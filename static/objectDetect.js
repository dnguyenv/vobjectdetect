const s = document.getElementById('objectDetect');
const sourceVideo = s.getAttribute("data-source"); //the source video to use
const uploadWidth = s.getAttribute("data-uploadWidth") || 640; //the width of the upload file
const mirror = s.getAttribute("data-mirror") || false; //mirror the boundary boxes
const scoreThreshold = s.getAttribute("data-scoreThreshold") || 0.5;
let pathName = window.location.pathname.substring(0, window.location.pathname.indexOf("/", 2));
const apiServer = s.getAttribute("data-apiServer") || window.location.origin + pathName + '/image'; //the full TensorFlow Object Detection API server url
const influxServer = window.location.origin + pathName + '/influx'

//Video element selector
v = document.getElementById(sourceVideo);

//for starting events
let isPlaying = false,
    gotMetadata = false;

//Canvas setup

//create a canvas to grab an image for upload
let imageCanvas = document.createElement('canvas');
let imageCtx = imageCanvas.getContext("2d");

//create a canvas for drawing object boundaries
let drawCanvas = document.createElement('canvas');
drawCanvas.setAttribute('id', 'drawCanvas');
document.body.appendChild(drawCanvas);
let drawCtx = drawCanvas.getContext("2d");

let statusCanvas = document.createElement('canvas');
statusCanvas.setAttribute('id', 'statusCanvas');
document.body.appendChild(statusCanvas);
let statusCtx = statusCanvas.getContext('2d');

const TRANSMISSION_TIME_TMPL = 'Transmission time: {TIME}s';
const SERVER_PROC_TIME_TMPL = 'Server processing time: {TIME}s';
const TIME_FIX = 3;
const RIGHT_MARGIN = 5;

function drawStatus(statusObj) {
    /*
        let dTime = parseFloat(statusObj.resp_time - statusObj.detection_time);
        let pTime = parseFloat(statusObj.detection_time);
        statusCtx.clearRect(0, 0, statusCanvas.width, statusCanvas.height);
        statusCtx.font = "14px Verdana";
        statusCtx.fillStyle = "blue";
        statusCtx.textAlign = "right";
        statusCtx.fillText(TRANSMISSION_TIME_TMPL.replace(/\{TIME\}/, dTime.toFixed(TIME_FIX)), statusCanvas.width - RIGHT_MARGIN, statusCanvas.height - 20);
        statusCtx.fillText(SERVER_PROC_TIME_TMPL.replace(/\{TIME\}/, pTime.toFixed(TIME_FIX)), statusCanvas.width - RIGHT_MARGIN, statusCanvas.height - 3);
        */
}

//draw boxes and labels on each detected object
function drawBoxes(objects, lat) {
    latc = 0;

    //clear the previous drawings
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    //$ Remove existing nodes in view
    var removeNodes = document.getElementById('objectList');
    removeNodes.innerHTML = '';

    // Reset all the existing objects
    let object_count = {};

    //filter out objects that contain a class_name and then draw boxes and labels on each
    objects.filter(object => object.class_name).forEach((object, index) => {

        // Add all the existing objects
        if (object_count[object.class_name]) {
            object_count[object.class_name] += 1;
        } else {
            object_count[object.class_name] = 1;
        }

        if (object.class_name == "latency") {
            latc = object.latency;
            let latcy = document.getElementById("ptime");
            latcy.innerHTML = `<div class="objectTitle">Detection - <span>${latc}</span><span>ms<span></div>`;
        } else {

            let x = object.x * drawCanvas.width;
            let y = object.y * drawCanvas.height;
            let width = (object.width * drawCanvas.width) - x;
            let height = (object.height * drawCanvas.height) - y;

            //flip the x axis if local video is mirrored
            if (mirror) {
                x = drawCanvas.width - (x + width)
            }

            drawCtx.lineWidth = 4;
            drawCtx.strokeStyle = "cyan";
            drawCtx.font = "20px Verdana";
            drawCtx.fillStyle = "cyan";

            drawCtx.fillText(object.class_name + " - " + Math.round(object.score * 100) + "%", x + 5, y + 20);
            drawCtx.strokeRect(x, y, width, height);

            // Render element if it is new.
            if (object_count[object.class_name] == 1) {
                //$ Add Objects to object list view
                let objectDetails = document.createElement("div");

                // Place to initialize object view data
                objectDetails.innerHTML = `
            <div class="objectTitle">${object.class_name} - <span>${object_count[object.class_name]}</span></div>`;

                // code for adding object description
                // <div class="objectDescription">Lorem ipsum dolor sit, 
                //     amet consectetur adipisicing elit. Non, veritatis!
                // </div>`;

                objectDetails.setAttribute("class", "objectDetails");
                objectDetails.setAttribute("id", `object_${object.class_name}`);
                document.getElementById('objectList').appendChild(objectDetails);
            } else {
                // Update the element
                if (object.class_name) {
                    let updateElement = document.getElementById(`object_${object.class_name}`);
                    updateElement.innerHTML = `
                <div class="objectTitle">${object.class_name} - <span>${object_count[object.class_name]}</span></div>`;

                    // code for adding description
                    // <div class="objectDescription">Lorem ipsum dolor sit, 
                    //     amet consectetur adipisicing elit. Non, veritatis!
                    // </div>`;
                }
            }

            lat = Math.round(lat * 10) / 10;
            let latency = document.getElementById("latency");
            latency.innerHTML = `<div class="objectTitle">latency - <span>${lat}</span><span>ms<span></div>`;

        }
        lat = Math.round(lat * 10) / 10;
        lat = Math.round((lat - latc));
        let latency = document.getElementById("latency");
        latency.innerHTML = `<div class="objectTitle">latency - <span>${lat}</span><span>ms<span></div>`;#

    });
}

//Add file blob to a form and post
function postFile(file) {
    let sTime = new Date().getTime() / 1000;
    //Set options as form data
    let formdata = new FormData();
    formdata.append("image", file);
    formdata.append("threshold", scoreThreshold);
    var t0 = performance.now();
    let xhr = new XMLHttpRequest();
    xhr.open('POST', apiServer, true);
    xhr.onload = function() {
        if (this.status === 200) {
            let objects = JSON.parse(this.response);

            //draw the text
            let statusObj = null;
            if (objects && objects.length > 0 && objects[objects.length - 1].detection_time >= 0) {
                statusObj = objects.pop();
            }
            statusObj = Object.assign({ 'resp_time': ((new Date().getTime() / 1000) - sTime), 'detection_time': 0 }, statusObj);
            drawStatus(statusObj);

            //draw the boxes
            var t1 = performance.now();
            var lat = t1 - t0;
            drawBoxes(objects, lat);

            //Save and send the next image

            imageCtx.drawImage(v, 0, 0, v.videoWidth, v.videoHeight, 0, 0, uploadWidth, uploadWidth * (v.videoHeight / v.videoWidth));

            imageCanvas.toBlob(postFile, 'image/jpeg');
        } else {
            console.error(xhr);
        }
    };
    xhr.send(formdata);
}

//Start object detection
function startObjectDetection() {

    console.log("starting object detection");

    //Set canvas sizes base don input video
    drawCanvas.width = v.videoWidth;
    drawCanvas.height = v.videoHeight;

    imageCanvas.width = uploadWidth;
    imageCanvas.height = uploadWidth * (v.videoHeight / v.videoWidth);

    //Some styles for the drawcanvas
    drawCtx.lineWidth = 4;
    drawCtx.strokeStyle = "cyan";
    drawCtx.font = "20px Verdana";
    drawCtx.fillStyle = "cyan";

    //Save and send the first image
    imageCtx.drawImage(v, 0, 0, v.videoWidth, v.videoHeight, 0, 0, uploadWidth, uploadWidth * (v.videoHeight / v.videoWidth));
    imageCanvas.toBlob(postFile, 'image/jpeg');

}

//Starting events

//check if metadata is ready - we need the video size
v.onloadedmetadata = () => {
    console.log("video metadata ready");
    gotMetadata = true;
    if (isPlaying)
        startObjectDetection();
};

//see if the video has started playing
v.onplaying = () => {
    console.log("video playing");
    isPlaying = true;
    if (gotMetadata) {
        startObjectDetection();
    }
};
3