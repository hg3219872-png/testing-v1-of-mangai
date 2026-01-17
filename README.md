# Manga Panel Auto-Framing Viewer - MVP

A web application that transforms static manga PDFs into dynamic, focused reading experiences by automatically detecting, framing, and sequencing panels in the correct reading order.

## Features

- 📄 **PDF Upload**: Drag-and-drop or file picker with validation (max 50MB)
- 🖼️ **PDF to Image Conversion**: High-resolution page extraction (1200px+ width)
- 🔍 **Automatic Panel Detection**: Edge detection and contour finding to identify panel boundaries
- 📐 **Panel Sequencing**: Intelligent reading order detection (LTR/RTL, row-based sorting)
- 🎯 **Focused Auto-Framing**: One panel at a time with background blur/dim effects
- ▶️ **Playback Controls**: Play, pause, next, previous with customizable interval timing
- ⌨️ **Keyboard Navigation**: Arrow keys, spacebar, and ESC support
- 📊 **Progress Tracking**: Real-time processing indicators
- 🗣️ **AI Voice (TTS)**: Optional panel dialogue readout with provider selection

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **PDF.js** - PDF parsing and rendering
- **Canvas API** - Image processing and panel detection

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## How It Works

1. **Upload**: User uploads a PDF file (validated for type and size)
2. **Conversion**: PDF pages are converted to high-resolution images
3. **Detection**: Each page is analyzed to detect panel boundaries using edge detection
4. **Sequencing**: Panels are ordered by reading direction (top-to-bottom, then LTR/RTL within rows)
5. **Framing**: Each panel is automatically framed with:
   - Tight crop to panel boundaries
   - Full-screen scaling (contain mode)
   - Background suppression (blur + dim) for surrounding content
6. **Viewing**: Panels are displayed sequentially with smooth transitions

## Auto-Framing Logic

The auto-framing system ensures:
- **One panel is the visual focus** at any time
- Focused panel occupies full screen
- **Surrounding panels are blurred/dimmed** to eliminate distraction
- Speech balloons and key content remain fully visible
- Splash/full-page panels are handled appropriately

## Usage

1. Upload a manga PDF file
2. Wait for processing (conversion → detection → sequencing)
3. Use playback controls or keyboard to navigate:
   - **← →** Arrow keys: Navigate between panels
   - **Space**: Advance to next panel
   - **ESC**: Pause auto-play
   - **Play/Pause button**: Toggle auto-playback
4. Adjust interval timing with the slider (0.5s - 5s)

## Project Structure

```
src/
  ├── components/
  │   ├── PDFUpload.tsx          # File upload with drag-and-drop
  │   ├── ProcessingIndicator.tsx # Progress display
  │   ├── PanelViewer.tsx        # Focused panel display with blur effects
  │   ├── PlaybackControls.tsx  # Playback controls and progress
  │   └── TTSControls.tsx       # Panel dialogue voice controls
  ├── utils/
  │   ├── pdfProcessor.ts       # PDF to image conversion
  │   ├── panelDetection.ts     # Panel boundary detection
  │   ├── panelSequencing.ts    # Reading order logic
  │   └── autoFraming.ts        # Focused framing with background suppression
  ├── types.ts                  # TypeScript type definitions
  ├── App.tsx                   # Main application component
  └── main.tsx                  # Entry point
```

## Future Enhancements

- Multi-language OCR and text extraction
- Advanced gaze direction analysis
- Motion line detection
- User accounts and saved reading positions
- Mobile app version
- Manga library management
- Social sharing features

## AI Voice (TTS)

The app can read the current panel's dialogue using AI voice providers
like ElevenLabs. For provider options and free tiers, see `docs/tts-providers.md`.

### ElevenLabs setup

1. Set the server environment variables:
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_ID` (optional, defaults to a sample voice)
2. Start the server and the Vite dev server.


## License

MIT
