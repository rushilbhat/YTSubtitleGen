window.myContentScriptHasRun = true;

let timestamps = [];
let intervalId;

function getVideoPlayer() {
    return document.getElementsByTagName('video');
}

function getCurrentTime() {
    const videoPlayer = getVideoPlayer()[0];
    if (!videoPlayer.ended) {
        return videoPlayer.currentTime * 1000;
        // console.log(videoPlayer.currentTime);
    }
}

function updateSubtitles() {
    const subtitles = document.getElementById("injected-subtitles");
    const currentTimeFromInterval = getCurrentTime();

    let subtitleFound = false;

    for (let subtitle of timestamps) {
        if (subtitle.start <= currentTimeFromInterval && subtitle.end >= currentTimeFromInterval) {
            subtitles.innerHTML = subtitle.text;
            subtitleFound = true;
            break;
        }
    }

    if (!subtitleFound) {
        subtitles.innerHTML = "LOADING..."
    }
}

function startTranscription() {
    chrome.runtime.sendMessage({ action: "startTranscription", url: window.location.href });
}

// function stopTranscription(){
//     chrome.runtime.sendMessage({ action: "stopTranscription" });
// }

function createSubtitlesContainer() {
    // let timestamps = await sendTranscriptionRequest();
    // let currentTimeFromInterval;
    var subtitles = document.createElement('div');
    subtitles.setAttribute("id", "injected-subtitles");
    subtitles.classList.add("caption-window", "ytp-caption-window-bottom", "ytp-caption-window-rollup");

    subtitles.setAttribute('draggable', 'true');

    subtitles.style.touchAction = 'none';
    subtitles.style.backgroundColor = 'rgba(8, 8, 8, 0.75)';
    subtitles.style.textAlign = 'left';
    subtitles.style.left = '50%';
    subtitles.style.transform = 'translate(-50%, -50%)';  // Offset the element's own width/height
    subtitles.style.bottom = '2%';

    // Get the player element
    // var player = document.getElementById("ytp-caption-window-container");
    var player = document.getElementById("movie_player");

    // Append the subtitles to the player
    player.appendChild(subtitles);
}


async function injectSubtitles() {
    if (!subtitlesContainerExists()) {

        createSubtitlesContainer();

        // Call printTimeStamp function every second (1000 ms)
        intervalId = setInterval(function () {
            // getCurrentTime();
            updateSubtitles();
        }, 1000);


        // To clear interval when video ends
        getVideoPlayer()[0].addEventListener('ended', function () {
            clearInterval(intervalId);
        });
    }
}


function addButton() {

    const existingButton = document.querySelector('.ytp-cc-button.ytp-button');
    if (existingButton) {
        return;  // Exit if button is already present
    }

    // Find the control bar where you want to add your button
    const controlBar = document.querySelector('.ytp-right-controls');

    if (controlBar) {
        // Create a button element
        const button = document.createElement('button');

        // Add a class to your button
        button.classList.add('ytp-cc-button');
        button.classList.add('ytp-button');


        button.textContent = 'CC';

        // Change the CSS properties
        button.style.bottom = "33%";
        button.style.position = "relative";
        button.style.textAlign = "center";
        button.style.fontSize = "25px";

        // Append your button to the control bar
        // controlBar.insertBefore(button, controlBar.firstChild);
        controlBar.appendChild(button);

    }
};

function resetState() {
    if (subtitlesContainerExists()) {
        document.getElementById('injected-subtitles').remove();
    }

    if (intervalId) {
        clearInterval(intervalId);
    }

    timestamps.length = 0;

}

function subtitlesContainerExists() {
    return !!document.getElementById('injected-subtitles');
}


addButton();

// Add event listener for the click event
const button = document.querySelector('.ytp-cc-button.ytp-button');
if (button) {
    button.addEventListener('click', function () {
        injectSubtitles();
        startTranscription();
    });
};

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.action === "pushNewSubtitles") {
        // console.log(message.data);
        timestamps.push(...message.data);
        console.log(timestamps);
    }
    else if (message.action === "reset") {
        resetState();
    }
});

