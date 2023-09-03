async function sendTranscriptionRequest(url) {
    const response = await fetch('http://127.0.0.1:3000/download', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
    });

    console.log("response", response);

    if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
    }
}


function listenToUpdates(onNewTimestamps) {
    const es = new EventSource('http://127.0.0.1:3000/updates');

    es.onmessage = function (event) {
        const message = JSON.parse(event.data);

        if (message.timestamps){
            onNewTimestamps(message.timestamps);
        }
        else if (message.status === "close") {
            es.close();
            console.log("close");

            if(message.error){
                console.log("error");
                throw new Error(message.error);
            }
        }
    };

    es.onerror = function (event) {
        es.close()
        throw new Error("Error while listening to updates from server")
    };
}

let transcribingTabId;


chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (message.action === "startTranscription" && !transcribingTabId) {
        try {
            transcribingTabId = sender.tab.id;
            await sendTranscriptionRequest(message.url);
            listenToUpdates((timestamps) => {
                chrome.tabs.sendMessage(transcribingTabId, { action: "pushNewSubtitles", data: timestamps })
            })
        }
        catch (error) {
            transcribingTabId = undefined;
            console.error(error);
        }
    }
});

function checkContentScript() { return window.myContentScriptHasRun };

async function resetServer() {
    const response = await fetch('http://127.0.0.1:3000/reset', { method: 'POST' });
    const responseData = await response.json();

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} Error: ${responseData}`);
    }
}

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    console.log(tab, changeInfo);
    if (changeInfo.status === "loading") {
        if (tab.url && tab.url.includes('youtube.com/watch')) {
            const injectionCheck = await chrome.scripting.executeScript({ target: { tabId: tabId }, func: checkContentScript })
            const isScriptInjected = injectionCheck[0].result;

            if (!isScriptInjected) {
                await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ["content.js"] });
            }
            else {
                chrome.tabs.sendMessage(tabId, { action: "reset" });
            }
        }

        if (transcribingTabId && tab.id === transcribingTabId) {
            try {
                transcribingTabId = undefined;
                await resetServer()
            }
            catch (error) {
                console.error(error);
            }
        }
    }
});

chrome.tabs.onRemoved.addListener(async function (tabId, removeInfo) {
    if (tabId === transcribingTabId) {
        console.log("Tab closed. Resetting server.");
        try {
            transcribingTabId = undefined;
            await resetServer()
        }
        catch (error) {

        }
    }
});