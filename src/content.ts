// Import strategies to ensure they register themselves
import './strategies/NetflixStrategy';

import { SubtitleOverlay } from './SubtitleOverlay';

// Initialize the subtitle overlay for browser environment
let subtitleOverlay: SubtitleOverlay | null = null;

// Use setTimeout to ensure all strategy files have loaded and registered
setTimeout(() => {
  subtitleOverlay = new SubtitleOverlay();

  // Load the example subtitles
  const exampleSubtitles = `1
00:00:20,287 --> 00:00:22,683
"We shall not cease from exploration...

2
00:00:22,763 --> 00:00:25,718
and the end of all our exploring
will be to arrive where we started...

3
00:00:25,799 --> 00:00:28,594
and know the place for the first time."
- T.S. Eliot, "Little Gidding"

4
00:00:28,676 --> 00:00:34,587
"After the game is before the game."
- S. Herberger

5
00:01:52,007 --> 00:01:54,243
Man...

6
00:01:54,323 --> 00:01:58,476
probably the most mysterious species
on our planet.`;

  subtitleOverlay.loadSubtitles(exampleSubtitles);
}, 0);

// Listen for messages from the popup
// This listener is set up outside the setTimeout to ensure it's always available
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  // Handle loadSubtitles action
  if (request.action === 'loadSubtitles') {
    if (subtitleOverlay) {
      subtitleOverlay.loadSubtitles(request.subtitles);
      sendResponse({ success: true });
    } else {
      // If overlay isn't ready yet, wait a bit and try again
      setTimeout(() => {
        if (subtitleOverlay) {
          subtitleOverlay.loadSubtitles(request.subtitles);
        }
      }, 100);
      sendResponse({ success: true });
    }
    return false; // Response sent synchronously
  }

  // Other actions (getOffset, increaseOffset, decreaseOffset, resetOffset)
  // are handled by SubtitleOverlay's own message listener
  // Return false to allow other listeners to handle them
  return false;
});

