# Open Captions

The missing feature of your favorite streaming application.

How many times you found a very interesting movie and there was no subtitles in your language? This project tries to solve this adding an overlay to your Netflix player and allowing you to load custom subtitles from places like [opensubtitles.org](opensubtitles.org).

## Supported Platforms

- Netflix

### Soon
- Amazon Prime Video
- Disney+

## Setup Instructions

### Prerequisites

- Google Chrome browser (version 88 or later)
- Node.js and npm (for development and testing)

### Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd open-captions
   ```

2. **Install dependencies** (for testing)
   ```bash
   npm install
   ```

3. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner)
   - Click **Load unpacked**
   - Select the `open-captions` directory (the folder containing `manifest.json`)
   - The extension should now appear in your extensions list

4. **Verify installation**
   - You should see the "Streaming Subtitle Overlay" extension in your Chrome extensions list
   - The extension icon should appear in your Chrome toolbar
   - You should be able to see the overlay when opening a movie on Netflix and the timer should follow Netflix timer