import { PoseLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";
const demosSection = document.getElementById("demos");
let poseLandmarker = undefined;
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";
// Declare hoek variabelen voor globale scope
let leg = "left";
let vorigeHoek = 180;
//let avorigeHoek = 180;
let prevLeg = "left";
let bbx;
let bby;
let obx;
let oby;
let abbx;
let abby;
let aobx;
let aoby;
let beweging = [];
let abeweging = [];
let knieBuigingen = [];
let detectieIndex = 0;
let oefeningVolledig = [];
let framesSindsBeenWissel = -1;
function downloadResultaten() {
    let hiddenElement = document.createElement("a");
    let textToSave = oefeningVolledig;
    hiddenElement.href = 'data:attachment/text,' + encodeURI(textToSave);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'resultaten.txt';
    hiddenElement.click();
}
// Before we can use PoseLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createPoseLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minTrackingConfidence: 0.60,
        minPosePresenceConfidence: 0.60,
        minPoseDetectionConfidence: 0.60
    });
    demosSection.classList.remove("invisible");
};
createPoseLandmarker();
const video = document.getElementById("webcam");
const output = document.getElementById("output");
const table = document.getElementById("table");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const drawingUtils = new DrawingUtils(canvasCtx);
// Check if webcam access is supported.
const hasGetUserMedia = () => { var _a; return !!((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.getUserMedia); };
// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
}
else {
    console.warn("getUserMedia() is not supported by your browser");
}
// Enable the live webcam view and start detection.
function enableCam(event) {
    if (!poseLandmarker) {
        console.log("Wait! poseLandmaker not loaded yet.");
        return;
    }
    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    }
    else {
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    }
    // getUsermedia parameters.
    const constraints = {
        video: true
    };
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
}
let lastVideoTime = -1;
async function predictWebcam() {
    canvasElement.style.height = videoHeight;
    video.style.height = videoHeight;
    canvasElement.style.width = videoWidth;
    video.style.width = videoWidth;
    // Now let's start detecting the stream.
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            if (result.landmarks.length > 0) { // net aangepast: verander terug naar worldLandmarks.length als het niet werkt
                framesSindsBeenWissel += 1;
                console.log(result.WorldLandmarks);
                console.log(framesSindsBeenWissel);
                if (framesSindsBeenWissel > 200) {
                    leg = document.getElementById("leg-select").value;
                    if (leg != prevLeg) {
                        knieBuigingen = []; //clear de tabel wanneer het been wordt veranderd
                        oefeningVolledig.push(leg);
                        prevLeg = leg;
                    }
                    const l = result.landmarks[0];
                    if (detectieIndex % 5 == 0) { // elke 5 detecties wordt er een nieuwe berekend
                        if (leg == "links") { // linkerbeen detectie
                            // detectie been
                            bbx = l[23].x - l[25].x;
                            bby = l[23].y - l[25].y;
                            obx = l[27].x - l[25].x;
                            oby = l[27].y - l[25].y;
                            // ander been
                            abbx = l[24].x - l[26].x;
                            abby = l[24].y - l[26].y;
                            aobx = l[28].x - l[26].x;
                            aoby = l[28].y - l[26].y;
                        }
                        else { //rechterbeen detectie
                            // detectie been
                            bbx = l[24].x - l[26].x;
                            bby = l[24].y - l[26].y;
                            obx = l[28].x - l[26].x;
                            oby = l[28].y - l[26].y;
                            // ander been
                            abbx = l[23].x - l[25].x;
                            abby = l[23].y - l[25].y;
                            aobx = l[27].x - l[25].x;
                            aoby = l[27].y - l[25].y;
                        }
                        let hoekRad = Math.acos(((bbx * obx) + (bby * oby)) / (Math.sqrt(bbx ** 2 + bby ** 2) * Math.sqrt(oby ** 2 + obx ** 2)));
                        let hoekGraden = hoekRad / Math.PI * 180; // geeft de hoek in graden
                        //let ahoekRad = Math.acos(((abbx*aobx)+(abby*aoby))/(Math.sqrt(abbx**2+abby**2)*Math.sqrt(aoby**2+aobx**2)));
                        //let ahoekGraden = ahoekRad/Math.PI*180; // geeft de hoek in graden van het andere been
                        // Om een nauwkeuriger meetresultaat te verkrijgen bij het switchen van been, wordt de detectie voor de eerste paar seconden na het wisselen van kant uitgezet
                        if (hoekGraden < 160) {
                            beweging.push(hoekGraden); // zet elke plooi in een lijst
                            //abeweging.push(ahoekGraden);
                        }
                        else if (vorigeHoek < 160) { // zet de diepste plooi in een nieuwe lijst wanneer wordt gestrekt
                            const resultaat = Math.min(...beweging);
                            //const aresultaat = Math.min(...abeweging);
                            //if (resultaat < aresultaat) {
                            beweging = []; // start nieuwe beweging
                            knieBuigingen.push(Math.round(resultaat)); // zet minimum in nieuwe lijst
                            oefeningVolledig.push(Math.round(resultaat));
                            console.log(knieBuigingen);
                            document.getElementById('download').addEventListener('click', downloadResultaten); // download de volledige oefening
                            while (table.rows.length > 1) {
                                table.deleteRow(1); // verwijdert eerst de volledige tabel
                            }
                            for (let hoek in knieBuigingen) {
                                let row = table.insertRow(-1); // maakt een nieuwe rij onder in de tabel aan
                                let knieIndex = row.insertCell(0);
                                let knieHoek = row.insertCell(1);
                                knieIndex.innerHTML = hoek;
                                knieHoek.innerHTML = knieBuigingen[hoek];
                            }
                            //}
                        }
                        // output.innerHTML = leg == "left" ? "Plaats de camera aan uw linkerkant" : "Plaats de camera aan uw rechterkant"
                        vorigeHoek = hoekGraden;
                        //avorigeHoek = ahoekGraden;
                    }
                    detectieIndex += 1;
                }
            }
            for (const landmark of result.landmarks) {
                //        console.log("--> 13 = "+JSON.stringify(landmark[13]) + " 15 = "+ JSON.stringify(landmark[15]))
                drawingUtils.drawLandmarks(landmark, {
                    radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.2, 10, 2)
                });
                drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
            }
            canvasCtx.restore();
        });
    }
    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
        //await new Promise(r => setTimeout(r, 200));
        window.requestAnimationFrame(predictWebcam);
    }
}