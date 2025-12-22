class SubtitleOverlay {
    constructor() {
      this.overlay = null;
      this.currentSubtitles = [];
      this.platform = null;
      this.timeOffset = 0; // Time offset in seconds
      this.initialize();
      this.setupMessageListener();
    }
  
    initialize() {
      // Detect the platform
      this.platform = PlatformDetector.detect();
      if (!this.platform) {
        console.error("No supported platform detected");
        return;
      }
  
      console.log("Detected platform:", this.platform.constructor.name);

      // Create the subtitle overlay element
      this.overlay = document.createElement("div");
      this.overlay.className = "subtitle-overlay";
      document.body.appendChild(this.overlay);

      // Show initial placeholder content
      this.overlay.innerHTML = `
        <div class="time-display">
          <span class="time">--:--</span>
          <span class="separator">/</span>
          <span class="time">--:--</span>
        </div>
      `;

      // Start the update loop immediately, even before video player is found
      // This ensures the timer updates as soon as the video player is detected
      this.platform.setupVideoListeners(() => {
        this.updateDisplay();
      });

      // Start observing for video player
      this.platform.observeVideoPlayer(() => {
        if (this.platform.videoPlayer && !this.platform.videoPlayerFound) {
          this.platform.videoPlayerFound = true;
          this.setupVideoListeners();
        }
      });
    }
  
    setupVideoListeners() {
      if (!this.platform || !this.platform.videoPlayer) return;

      this.platform.setupVideoListeners(() => {
        this.updateDisplay();
      });

      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();

      // Initial display update
      this.updateDisplay();

      console.log("Video player found:", this.platform.videoPlayer);
    }
  
    parseTime(timeStr) {
      // Parse time in format HH:MM:SS,mmm
      const [time, milliseconds] = timeStr.split(",");
      const [hours, minutes, seconds] = time.split(":").map(Number);
      return hours * 3600 + minutes * 60 + seconds + Number(milliseconds) / 1000;
    }
  
    parseSubtitles(subtitleText) {
      const subtitles = [];
      const blocks = subtitleText.split("\n\n");
  
      for (const block of blocks) {
        const lines = block.split("\n");
        if (lines.length < 3) continue;
  
        const index = parseInt(lines[0]);
        const [startTime, endTime] = lines[1].split(" --> ").map((t) => t.trim());
        const text = lines.slice(2).join("\n");
  
        subtitles.push({
          index,
          startTime: this.parseTime(startTime),
          endTime: this.parseTime(endTime),
          text: text,
        });
      }
  
      return subtitles;
    }
  
    updateDisplay() {
      if (!this.platform || !this.overlay) return;

      const currentTime = this.platform.getCurrentTime();
      const duration = this.platform.getDuration();

      // Always show the timer if we have a valid time, even without subtitles
      if (currentTime === null) {
        // If we can't get time yet, show a placeholder or hide the overlay
        this.overlay.innerHTML = `
          <div class="time-display">
            <span class="time">--:--</span>
            <span class="separator">/</span>
            <span class="time">--:--</span>
          </div>
        `;
        return;
      }

      const formattedTime = this.formatTime(currentTime);
      const formattedDuration = duration ? this.formatTime(duration) : "--:--";

      // Find the current subtitle, applying the offset to the subtitle times
      // Positive offset delays subtitles (appear later), negative offset advances them (appear earlier)
      let currentSubtitle = null;
      if (this.currentSubtitles.length > 0) {
        currentSubtitle = this.currentSubtitles.find(
          (sub) =>
            currentTime >= sub.startTime + this.timeOffset &&
            currentTime < sub.endTime + this.timeOffset
        );
      }

      this.overlay.innerHTML = `
        <div class="time-display">
          <span class="time">${formattedTime}</span>
          <span class="separator">/</span>
          <span class="time">${formattedDuration}</span>
          ${
            this.timeOffset !== 0
              ? `<span class="offset">(${this.timeOffset > 0 ? "+" : ""}${
                  this.timeOffset
                }s)</span>`
              : ""
          }
        </div>
        ${
          currentSubtitle
            ? `<div class="subtitle-text">${currentSubtitle.text}</div>`
            : ""
        }
      `;
    }
  
    formatTime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      const milliseconds = Math.floor((seconds % 1) * 1000);
  
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
          .toString()
          .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
      } else {
        return `${minutes}:${remainingSeconds
          .toString()
          .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
      }
    }
  
    loadSubtitles(subtitleText) {
      this.currentSubtitles = this.parseSubtitles(subtitleText);
      // Update display after loading subtitles
      this.updateDisplay();
    }
  
    cleanup() {
      if (this.platform) {
        this.platform.cleanup();
      }
  
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
        this.overlay = null;
      }
    }
  
    increaseOffset() {
      this.timeOffset += 1;
      this.updateDisplay();
    }
  
    decreaseOffset() {
      this.timeOffset -= 1;
      this.updateDisplay();
    }
  
    resetOffset() {
      this.timeOffset = 0;
      this.updateDisplay();
    }
  
    setupKeyboardShortcuts() {
      document.addEventListener("keydown", (event) => {
        // Only handle shortcuts when video is playing
        if (!this.platform || !this.platform.videoPlayer || this.platform.videoPlayer.paused) return;
  
        // Ctrl/Command + Shift + Right Arrow: Increase offset by 1 second
        if (
          (event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          event.key === "ArrowRight"
        ) {
          this.increaseOffset();
          event.preventDefault();
        }
        // Ctrl/Command + Shift + Left Arrow: Decrease offset by 1 second
        else if (
          (event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          event.key === "ArrowLeft"
        ) {
          this.decreaseOffset();
          event.preventDefault();
        }
        // Ctrl/Command + Shift + R: Reset offset
        else if (
          (event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          event.key.toLowerCase() === "r"
        ) {
          this.resetOffset();
          event.preventDefault();
        }
      });
    }
  
    setupMessageListener() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
          case "getOffset":
            sendResponse({ offset: this.timeOffset });
            return false; // Response sent synchronously
          case "increaseOffset":
            this.increaseOffset();
            sendResponse({ success: true, offset: this.timeOffset });
            return false; // Response sent synchronously
          case "decreaseOffset":
            this.decreaseOffset();
            sendResponse({ success: true, offset: this.timeOffset });
            return false; // Response sent synchronously
          case "resetOffset":
            this.resetOffset();
            sendResponse({ success: true, offset: this.timeOffset });
            return false; // Response sent synchronously
        }
        return false; // Not handled by this listener
      });
    }
  }