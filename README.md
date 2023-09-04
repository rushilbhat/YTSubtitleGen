# YTSubtitleGen

This Chrome extension performs real-time transcription of YouTube videos using whisper.cpp, processing everything locally on your device. It automatically injects the resulting subtitles into the YouTube video player.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation): for downloading YouTube videos' audio for transcription

### Steps

1. **Setup Whisper.cpp**
   
   If you have not cloned the repository with the --recursive flag (`git clone --recursive https://github.com/rushilbhat/YTSubtitleGen.git`), run the following two commands at the root of the repository
   ```
   git submodule init
   git submodule update
   ```
   Navigate to `whisper.cpp`, download the Whisper small model converted in ggml format (small model currently harcorded in `server.js`. See below for instructions on [downloading and running other Whisper models](#downloading-and-running-other-whisper-models)) and make the main example.
   ```bash
   cd whisper.cpp
   bash ./models/download-ggml-model.sh small
   make
    ```

2. **Install Server Dependencies**:
   
   Navigate to the `server` directory
   ```
   npm install
   ```

3. **Set up the Chrome Extension**:
   - Open Chrome.
   - Navigate to `chrome://extensions/`.
   - Ensure "Developer mode" is toggled on.
   - Click on "Load unpacked" and select the `extension` directory from this repository.
  
4. **Run the Server**:
   From the `server` directory, run:
   ```
   npm start
   ```
   Ensure the server is running on `http://127.0.0.1:3000/`.

5. **Usage**
   
   Open any YouTube video in Chrome.
   
   Click on the CC button on the YouTube video player controls to start real-time transcription. The subtitles will automatically be injected into the YouTube video player.

## Downloading and running other Whisper models
  Use the download-ggml-model.sh script to download one of the Whisper models already converted in ggml format. See available models at [whisper.cpp/models/README.md](https://github.com/ggerganov/whisper.cpp/blob/5e2b3407ef46eccebe55a64c100401ab37cc0374/models/README.md)
  ```bash
  cd whisper.cpp

  # Replace [MODEL_NAME] with the desired model, for example, base, base.en, small, small.en, medium etc.
  ./models/download-ggml-model.sh [MODEL_NAME] 
  ```
  After downloading, update the relative path stored under `model` in `server/server.js`. For example, if you downloaded the medium model:
  ```
  const model = "../whisper.cpp/models/ggml-medium.bin";
  ```

  ### Quantization
  
  If you want to create a quantized model from one of Whisper ggml models, in the root directory run:
  ```bash
  ./quantize models/ggml-medium.bin models/ggml-medium-q5_0.bin q5_0
  ```
  Update the relative path stored under `model` in `server/server.js` accordingly. Further details on quantization [here](https://github.com/ggerganov/whisper.cpp#quantization)