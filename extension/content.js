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

function createSubtitlesContainer() {
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
    var player = document.getElementById("movie_player");

    player.appendChild(subtitles);
}


async function injectSubtitles() {
    if (!subtitlesContainerExists()) {

        createSubtitlesContainer();

        intervalId = setInterval(function () {
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
        return;
    }

    const controlBar = document.querySelector('.ytp-right-controls');

    if (controlBar) {
        const button = document.createElement('button');

        button.classList.add('ytp-cc-button');
        button.classList.add('ytp-button');


        button.textContent = 'CC';

        button.style.bottom = "33%";
        button.style.position = "relative";
        button.style.textAlign = "center";
        button.style.fontSize = "25px";

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

const button = document.querySelector('.ytp-cc-button.ytp-button');
if (button) {
    button.addEventListener('click', function () {
        injectSubtitles();
        startTranscription();
    });
};

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.action === "pushNewSubtitles") {
        timestamps.push(...message.data);
        console.log(timestamps);
    }
    else if (message.action === "reset") {
        resetState();
    }
});

