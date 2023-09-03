const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const events = require('events');


const app = express();
const corsOptions = {
    origin: ['chrome-extension://hgkpinhfjeiojdmoogdfhjpkmofdedfn']
};

// To get request's JSON body
app.use(express.json());
app.use(cors(corsOptions));

const eventEmitter = new events.EventEmitter(); // 2. Create an EventEmitter instance

// app.get('/', (req, res) => {
//     res.send('Server is running');
// });

// let timestamps = [];

function parseTimestamp(timestamp) {
    let [hours, minutes, seconds] = timestamp.split(':');
    seconds = parseFloat(seconds);
    // Convert to milliseconds
    return hours * 60 * 60 * 1000 + minutes * 60 * 1000 + seconds * 1000;
}

function generateTimestamps(output) {
    let timestamps = [];

    var transcription = output;

    // Regex to match the timestamp and text components of each line
    let regex = /\[(.*?)\]\s*(.+)/g;

    let match;

    // Loop over all matches in the string
    while ((match = regex.exec(transcription)) !== null) {
        let [startString, endString] = match[1].split(' --> ');         // Split the timestamp string into start and end

        let start = parseTimestamp(startString);        // Parse the start and end timestamps into Date objects
        let end = parseTimestamp(endString);

        let text = match[2];         // Get the text from the match
        timestamps.push({ start, end, text });
    }

    return timestamps;
}

let transcriptionProcess = null;

async function transcribe() {
    // console.log("transcribe");
    let audio = "./temp/output.wav"    
    // let model = "../models/ggml-medium-q5_0.bin";
    let model = "../whisper.cpp/models/ggml-small-q5_0.bin";
    transcriptionProcess = spawn('../whisper.cpp/main', ['-m', model, audio]);

    let errorMessage;
    transcriptionProcess.stderr.on('data', (data) => {
        console.log("stderr", data.toString());
        const strData = data.toString();
        if (strData.includes("error:")) {
            // errorMessage = strData.split("error:")[1].trim();
            errorMessage = strData
        }
    });

    transcriptionProcess.stdout.on('data', (data) => {
        console.log("stdout", data.toString())
        broadcast({ timestamps: generateTimestamps(data) });
    });

    transcriptionProcess.on('error', (error) => {
        errorMessage = error.message;
        console.log(errorMessage)
    });

    transcriptionProcess.on('close', (code) => {
        console.log(`Transcription process exited with code ${code}`);

        const closeMessage = { status: "close" }
        if (errorMessage) {
            closeMessage.error = errorMessage;
        }

        broadcast(closeMessage);

        transcriptionProcess = null;
    });
}


async function clearTemp() {
    const tempPath = "./temp"
    const files = await fs.readdir(tempPath);

    for (const file of files) {
        if (file === '.gitkeep') continue;

        const filePath = path.join(tempPath, file);
        await fs.unlink(filePath);
        console.log(`Deleted file ${filePath}`);
    }
}


let client;

function broadcast(data) {
    if (client) {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
    }
}

app.get('/updates', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    client = res;
    // console.log("active", client);

    req.on('close', () => {
        // console.log("close", client);
        client = null
    });
});

app.post('/transcribe', (req, res) => {
    res.status(200).json({ message: 'Video downloaded and converted successfully' });

    transcribe()
});

let downloadProcess = null;
app.post('/download', (req, res) => {
    const url = req.body.url;
    if (!url) {
        return res.status(400).json({ error: 'No url provided' });
    }
    console.log(url);

    downloadProcess = spawn('yt-dlp', ['-x', '--audio-format', 'wav', '--output', './temp/output.%(ext)s', '--postprocessor-args', '-ar 16000', url]);

    let errorMessage;
    downloadProcess.stderr.on('data', (data) => {
        const strData = data.toString();
        if (strData.includes("error:")) {
            errorMessage = strData;
        }
    });

    downloadProcess.on('error', (error) => {
        errorMessage = error.message;
        console.log(errorMessage)
    });

    downloadProcess.on('close', async (code) => {
        console.log(`Download process exited with code ${code}`);
        if (code === 0) {
            res.status(200).json({ message: 'Video downloaded and resampled successfully' });
            eventEmitter.emit('videoDownloaded');
        }
        else if (code === null) {
            res.status(202).json({ message: 'Download was interrupted by a reset request' });
        }
        else {
            res.status(500).json({ error: errorMessage });
        }
        downloadProcess = null;
    });


});


eventEmitter.on('videoDownloaded', () => {
    transcribe();
});

let isResetting = false;

app.post('/reset', async (req, res) => {
    if (isResetting) {
        return res.status(202);
    }
    console.log("reset");

    isResetting = true;

    if (downloadProcess) {
        await downloadProcess.kill();
    }
    else if (transcriptionProcess) {
        await transcriptionProcess.kill();
    }

    try {
        await clearTemp();
        res.status(200).json({ message: 'Server reset successfully' });
    }
    catch (error) {
        console.error("Error during reset:", error);
        res.status(500).json({ message: 'Error during server reset' });
    }
    finally {
        isResetting = false;
    }
});


const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
