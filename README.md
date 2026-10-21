# Hueverb

*A gallery of heard things.*

Hueverb is an interactive exhibition where sound becomes painting. Play a song, sing, clap, or hum, and every sound leaves its own brush stroke on the canvas: pitch decides where it lands and what color it takes, loudness sets its weight, and the texture of the sound shapes the mark it makes. When the music ends, you have an original artwork to hang in your collection or download as a print-ready image.

**Live site:** [xvkei.github.io/hueverb](https://xvkei.github.io/hueverb/)

---

## The idea

Wassily Kandinsky believed painting and music were the same art in different forms. He described colors as having tones and compositions as having rhythm. Hueverb takes that idea literally: instead of visualizing music as bars or waveforms, it treats each sound as a gesture, the way a painter treats each stroke.

The whole experience is designed like a museum visit. You walk in through a title wall, read the visitor guide, paint in the studio, and hang your finished pieces in a personal collection, each one with its own placard listing the title, medium, dimensions, and date.

---

## Features

- **Every sound paints a stroke.** New sounds are detected as they happen, and each one starts a stroke that keeps flowing for as long as the sound lasts.
- **Ten brushes, including Auto.** Oil, Watercolor, Ink, Dots, Charcoal, Drip, Sketch, Knife, and Shapes, each with its own rendering technique. In Auto mode, the character of each sound chooses the brush.
- **Twelve artist-inspired palettes,** from Kandinsky and Monet to Rothko, Hockney, and Sumi ink.
- **Track and voice together.** Upload a track, turn on the microphone, and sing along. Both paint the same canvas at once.
- **Five canvas shapes:** Square, Portrait, Story, Landscape, and Wide, each exported at print resolution (up to 2400 px).
- **A personal collection.** Acquired paintings are saved in the browser, with a gallery wall, a viewing screen, and PNG downloads.
- **A live placard** that writes itself as you paint, listing the track title, the media used ("Sound, voice, oil and ink on paper"), stroke count, duration, and dimensions.
- **Fully responsive.** A two-column studio on desktop, and a touch toolbar, bottom sheet, and swipe gestures on phones.
- **Performance-friendly controls.** Arrow keys for quick steps and hold-to-open radial wheels for jumping straight to any brush or palette mid-song.

---

## How it works

### Listening

Audio from the track and the microphone flows into a single Web Audio `AnalyserNode`. Every frame, Hueverb reads the frequency spectrum and the raw waveform, and turns them into a handful of features:

| Feature | How it's measured | What it controls |
| --- | --- | --- |
| **New sound (onset)** | Spectral flux: how much the spectrum suddenly increased compared to its recent average | When a new stroke starts |
| **Loudness** | Root mean square (RMS) of the waveform, compared to the loudest moment so far | Stroke thickness and speed |
| **Pitch** | Center of energy across 24 logarithmically spaced bands (60 Hz to 8 kHz) | Stroke height and color |
| **Roughness** | Zero-crossing rate of the waveform | Jittery edges, splatter, and brush choice in Auto mode |

A few details make it work with any sound in any room:

- **Logarithmic bands.** Hearing works on a logarithmic scale, but an FFT spaces frequencies evenly, which gives high frequencies far more weight. Grouping the spectrum into musical bands lets low and high sounds count equally.
- **Relative pitch.** Pitch is measured against the range of the current song or voice, so a bass-heavy track and a whistle both use the full height of the canvas.
- **Adaptive thresholds.** The background noise floor and the peak volume are tracked continuously, so quiet rooms, loud music, and phone microphones all behave sensibly.

### Composing

Each new stroke tries several candidate positions near its pitch height and picks the least crowded one, using a coarse density grid that records where paint has already landed. Strokes wander along smooth, gestural curves and steer back toward the center near the edges, so paintings fill the whole canvas instead of piling up in one area.

### Painting

Drawing happens in resolution-independent units, with the shorter side of the canvas always 1000 units, so brushes look the same on every canvas shape. CSS scales the canvas to fit the screen, which means resizing the window or rotating a phone never clears or distorts a painting.

| Brush | Technique | Auto mode picks it for |
| --- | --- | --- |
| Oil | 26 bristles clustered toward the center, each running out of paint at its own pace (dry-brush effect) | Everything not covered below |
| Watercolor | Overlapping translucent washes with multiply blending, plus darker pigment edges | Soft sounds |
| Ink | A calligraphy nib at a fixed slant, so lines turn thick and thin with direction | High sounds |
| Dots | Pointillist clusters of colored dots, denser toward the center | Hissy, noisy sounds |
| Charcoal | Hundreds of tiny grains per step with occasional soft smudges | Low sounds |
| Drip | Poured lines of varying thickness, flung droplets, and drips that run down the canvas | Loud, noisy sounds |
| Sketch | Fine lines that connect to nearby earlier points, building web-like shading | Very high sounds |
| Knife | Flat bands of color with dragged streaks that skip as the knife runs dry | Loud bass |
| Shapes | Kandinsky-style circles, rings, triangles, and squares along a thin line | Big, sudden hits |

---

## Controls

### Desktop

| Action | Control |
| --- | --- |
| Previous or next brush | Left and right arrow keys |
| Previous or next palette | Up and down arrow keys |
| Jump to any brush | Hold **B**, flick the mouse toward a brush, release |
| Jump to any palette | Hold **C**, flick the mouse toward a palette, release |
| Swap back to the previous choice | Quick tap of **B** or **C** |
| Open the visitor guide | **?** |
| Close a wheel, dialog, or overlay | **Esc** |

### Mobile

| Action | Control |
| --- | --- |
| Add, play, or pause a track | Music button in the toolbar |
| Paint with your voice | Microphone button in the toolbar |
| Change brushes | Tap the brush strip, or swipe the canvas left and right |
| Palettes, canvas sizes, brush size | Swatch button in the toolbar |
| Open the visitor guide | **?** button in the toolbar |

---

## Architecture

Hueverb is written in plain JavaScript using native ES modules, with no framework and no build step. Each module has one responsibility, and imports only flow one way, so no file depends on a file that depends back on it.

```
hueverb/
├── index.html
├── css/
│   ├── base.css         variables, reset, header, footer, shared components
│   ├── entrance.css     title wall and visitor guide
│   ├── studio.css       studio layout, frame, tools
│   ├── collection.css   collection grid and viewing screen
│   ├── overlays.css     guide overlay, dialogs, toast, wheels
│   └── mobile.css       mobile toolbar, sheet, breakpoints
└── js/
    ├── main.js          startup and the animation loop
    ├── config.js        settings, canvas sizes, palettes
    ├── state.js         shared state and small selectors
    ├── utils.js         color, text, and storage helpers
    ├── audio.js         microphone, tracks, sound analysis
    ├── canvas.js        canvas setup, screen fitting, crowd map
    ├── strokes.js       stroke lifecycle and Auto mode
    ├── ui.js            placard, status, pickers, overlays
    ├── collection.js    IndexedDB storage, collection room, viewer
    ├── rooms.js         entrance, routing, background animation
    ├── controls.js      buttons, keyboard, wheels, swipes
    └── brushes/
        ├── index.js     brush registry
        └── *.js         one file per brush
```

### Brushes as plugins

Every brush is a self-contained module with the same shape. Only the labels and `paint` are required; everything else is an optional hook.

```javascript
export default {
  id: 'ink',
  label: 'Ink',
  short: 'Ink',                 // label for the mobile toolbar
  hint: 'Calligraphy pen, thick and thin',
  medium: 'ink',                // used on the placard

  setup(stroke, baseColor, sound) {},  // optional: runs when a stroke begins
  start(stroke, sound) {},             // optional: replaces the default splatter
  splatter: 0,                         // optional: extra splatter drops
  steer(stroke) {},                    // optional: custom brush movement
  paint(stroke) {},                    // required: draws one step
  everyFrame() {}                      // optional: runs every frame, even between strokes
};
```

Adding a new brush means creating one file in `js/brushes/` and adding one line to `brushes/index.js`. The pickers, wheels, placard, and keyboard shortcuts pick it up automatically.

---

## Tech stack

- **JavaScript (ES modules):** no frameworks or dependencies
- **Web Audio API:** `AnalyserNode`, media element and media stream sources
- **Canvas 2D:** all brush rendering, at fixed internal resolution
- **IndexedDB:** storing paintings and thumbnails as blobs
- **localStorage:** remembering preferences (canvas shape, skipped entrance)
- **CSS:** Grid, `clamp()` for fluid sizing, `aspect-ratio`, and media queries for hover and pointer type
- **Fonts:** Cormorant Garamond and Inter, from Google Fonts

---

## Privacy

Everything happens in your browser. Microphone audio is analyzed live and never recorded, stored, or sent anywhere. Paintings in your collection are saved only on your device, and clearing your browser data removes them. There are no accounts, servers, or analytics.

---

## Running locally

ES modules only load through a web server, so opening `index.html` directly as a file won't work.

1. Clone the repository:

```bash
   git clone https://github.com/xvkei/hueverb.git
   cd hueverb
```

2. Start a local server. Any of these works:
   - **VS Code:** install the Live Server extension, right-click `index.html`, and choose **Open with Live Server**
   - **Node:** `npx serve`
   - **Python:** `python -m http.server`

3. Open the address it prints (for example, `http://localhost:3000`).

Microphone access requires `localhost` or HTTPS, so it works locally and on GitHub Pages.

---

## Browser support

Hueverb works in current versions of Chrome, Edge, Firefox, and Safari, on desktop and mobile. Microphone painting needs permission from the browser, and the collection needs IndexedDB, which some strict private browsing modes disable.

---

## Inspiration and credits

- **Wassily Kandinsky,** for the idea that painting and music share a language, and for the geometry behind the Shapes brush
- **Jackson Pollock's** action paintings, behind the Drip brush
- **Gerhard Richter's** squeegee paintings, behind the Knife brush
- **Harmony** by Mr.doob, whose connected-line technique inspired the Sketch brush
- **Chrome Music Lab's Kandinsky** experiment, which turns drawings into sound, the reverse of Hueverb
- The palettes are inspired by the work of Kandinsky, Monet, Matisse, Hokusai and the ukiyo-e tradition, Van Gogh, Klimt, Rothko, Kahlo, Mondrian, Hockney, and East Asian sumi ink painting

---

## License

Released under the [MIT License](LICENSE).