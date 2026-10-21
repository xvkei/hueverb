# Hueverb

**See what your music sounds like.**

Hueverb turns any song or live microphone input into a generative mandala, painted in real time from the music's frequencies. When the song ends, save your artwork as a PNG.

🔗 **Live demo:** https://YOUR-USERNAME.github.io/hueverb/

## Features
- Upload any audio file or use your microphone
- Real-time generative art driven by sound frequencies
- Louder music spins faster and shifts colors
- Export your artwork as a PNG

## Built With
- HTML, CSS, JavaScript (no frameworks)
- Web Audio API (AnalyserNode / FFT)
- HTML Canvas

## How It Works
The Web Audio API splits the sound into frequency bands using a Fast Fourier Transform (FFT). Each band controls the distance, size, and color of dots drawn around the center, mirrored six times to form a mandala. Bass sits near the center, and treble paints the outer rings.

## Run Locally
Clone the repo and open `index.html` with a local server (e.g., VS Code Live Server). Microphone access requires `localhost` or HTTPS.

## Preview
_Add a demo GIF here!_
