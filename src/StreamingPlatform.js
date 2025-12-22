class StreamingPlatform {
  constructor() {
    this.videoPlayer = null;
    this.observer = null;
    this.animationFrameId = null;
    this.videoCheckInterval = null;
  }

  detect() {
    throw new Error("detect() must be implemented by platform class");
  }

  findVideoPlayer() {
    throw new Error("findVideoPlayer() must be implemented by platform class");
  }

  getCurrentTime() {
    if (!this.videoPlayer) return null;
    const time = this.videoPlayer.currentTime;
    return isNaN(time) ? null : time;
  }

  getDuration() {
    if (!this.videoPlayer) return null;
    const duration = this.videoPlayer.duration;
    return isNaN(duration) ? null : duration;
  }

  setupVideoListeners(onUpdate) {
    if (!this.videoPlayer) {
      // Even if no video player yet, start the update loop
      // It will update once the video player is found
      let lastTime = 0;
      const updateWithRAF = (timestamp) => {
        if (timestamp - lastTime >= 100) {
          // Update at most every 100ms
          lastTime = timestamp;
          onUpdate();
        }
        this.animationFrameId = requestAnimationFrame(updateWithRAF);
      };
      this.animationFrameId = requestAnimationFrame(updateWithRAF);
      return;
    }

    // Store bound methods for cleanup
    this.timeUpdateHandler = onUpdate;
    this.progressHandler = onUpdate;
    this.playingHandler = onUpdate;
    this.seekedHandler = onUpdate;
    this.loadedMetadataHandler = onUpdate;

    this.videoPlayer.addEventListener("timeupdate", this.timeUpdateHandler);
    this.videoPlayer.addEventListener("progress", this.progressHandler);
    this.videoPlayer.addEventListener("playing", this.playingHandler);
    this.videoPlayer.addEventListener("seeked", this.seekedHandler);
    this.videoPlayer.addEventListener("loadedmetadata", this.loadedMetadataHandler);

    // Use requestAnimationFrame as the primary update mechanism
    let lastTime = 0;
    const updateWithRAF = (timestamp) => {
      if (timestamp - lastTime >= 100) {
        // Update at most every 100ms
        lastTime = timestamp;
        onUpdate();
      }
      this.animationFrameId = requestAnimationFrame(updateWithRAF);
    };
    this.animationFrameId = requestAnimationFrame(updateWithRAF);
  }

  cleanupVideoListeners() {
    if (!this.videoPlayer) return;

    if (this.timeUpdateHandler) {
      this.videoPlayer.removeEventListener("timeupdate", this.timeUpdateHandler);
    }
    if (this.progressHandler) {
      this.videoPlayer.removeEventListener("progress", this.progressHandler);
    }
    if (this.playingHandler) {
      this.videoPlayer.removeEventListener("playing", this.playingHandler);
    }
    if (this.seekedHandler) {
      this.videoPlayer.removeEventListener("seeked", this.seekedHandler);
    }
    if (this.loadedMetadataHandler) {
      this.videoPlayer.removeEventListener("loadedmetadata", this.loadedMetadataHandler);
    }
  }

  observeVideoPlayer(onVideoFound) {
    // Observe DOM changes to find video player
    const observer = new MutationObserver(() => {
      this.findVideoPlayer();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.observer = observer;

    // Also try to find immediately
    this.findVideoPlayer();

    // Also check periodically in case MutationObserver misses changes
    this.videoCheckInterval = setInterval(() => {
      this.findVideoPlayer();
    }, this.videoPlayer ? 2000 : 500);
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.videoCheckInterval) {
      clearInterval(this.videoCheckInterval);
      this.videoCheckInterval = null;
    }

    if (this.videoPlayer) {
      this.cleanupVideoListeners();
      this.videoPlayer = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
