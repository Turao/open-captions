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
- Node.js and npm (for building and testing)

### Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd open-captions
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```
   This compiles the TypeScript source files and outputs the extension to the `dist/` folder.

4. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner)
   - Click **Load unpacked**
   - Select the **`dist`** folder (not the root project folder)
   - The extension should now appear in your extensions list

5. **Verify installation**
   - You should see the "Open Captions" extension in your Chrome extensions list
   - The extension icon should appear in your Chrome toolbar
   - You should be able to see the overlay when opening a movie on Netflix and the timer should follow Netflix timer

## Development

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build the extension to `dist/` folder |
| `npm run build:watch` | Watch mode - rebuilds on file changes |
| `npm test` | Run tests with Jest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run clean` | Remove the `dist/` folder |

### Project Structure

```
open-captions/
├── src/                          # TypeScript source files
│   ├── types.ts                  # Type definitions
│   ├── PlatformDetector.ts       # Platform detection logic
│   ├── StreamingPlatform.ts      # Base class for platforms
│   ├── SubtitleOverlay.ts        # Subtitle display logic
│   ├── content.ts                # Content script entry point
│   ├── popup.ts                  # Popup script
│   ├── strategies/               # Platform-specific implementations
│   │   └── NetflixStrategy.ts
│   └── __tests__/                # Test files
│       └── PlatformDetector.test.ts
├── dist/                         # Built extension (load this in Chrome)
├── icons/                        # Extension icons
├── styles.css                    # Subtitle overlay styles
├── popup.html                    # Popup UI
├── popup.css                     # Popup styles
├── manifest.json                 # Extension manifest
├── build.js                      # Build configuration (esbuild)
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

### Development Workflow

1. Make changes to TypeScript files in `src/`
2. Run `npm run build:watch` to automatically rebuild on changes
3. In Chrome, click the refresh icon on the extension card at `chrome://extensions/`
4. Test your changes

### Adding a New Streaming Platform

1. Create a new strategy file in `src/strategies/` (e.g., `AmazonStrategy.ts`)
2. Extend the `StreamingPlatform` base class
3. Implement the required methods: `detect()` and `findVideoPlayer()`
4. Register the platform with `PlatformDetector.register(YourPlatform)`
5. Update `manifest.json` to include the new platform's URL in `host_permissions` and `content_scripts.matches`
