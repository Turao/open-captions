import type { StreamingPlatformInstance } from './types';

export abstract class StreamingPlatform implements StreamingPlatformInstance {
  videoPlayer: HTMLVideoElement | null = null;
  videoPlayerFound?: boolean;
  
  protected observer: MutationObserver | null = null;
  protected animationFrameId: number | null = null;
  protected videoCheckInterval: ReturnType<typeof setInterval> | null = null;
  
  protected timeUpdateHandler?: () => void;
  protected progressHandler?: () => void;
  protected playingHandler?: () => void;
  protected seekedHandler?: () => void;
  protected loadedMetadataHandler?: () => void;

  abstract detect(): boolean;
  abstract findVideoPlayer(): HTMLVideoElement | null;

  getCurrentTime(): number | null {
    if (!this.videoPlayer) return null;
    const time = this.videoPlayer.currentTime;
    return isNaN(time) ? null : time;
  }

  getDuration(): number | null {
    if (!this.videoPlayer) return null;
    const duration = this.videoPlayer.duration;
    return isNaN(duration) ? null : duration;
  }

  setupVideoListeners(onUpdate: () => void): void {
    if (!this.videoPlayer) {
      // Even if no video player yet, start the update loop
      // It will update once the video player is found
      let lastTime = 0;
      const updateWithRAF = (timestamp: number): void => {
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

    this.videoPlayer.addEventListener('timeupdate', this.timeUpdateHandler);
    this.videoPlayer.addEventListener('progress', this.progressHandler);
    this.videoPlayer.addEventListener('playing', this.playingHandler);
    this.videoPlayer.addEventListener('seeked', this.seekedHandler);
    this.videoPlayer.addEventListener('loadedmetadata', this.loadedMetadataHandler);

    // Use requestAnimationFrame as the primary update mechanism
    let lastTime = 0;
    const updateWithRAF = (timestamp: number): void => {
      if (timestamp - lastTime >= 100) {
        // Update at most every 100ms
        lastTime = timestamp;
        onUpdate();
      }
      this.animationFrameId = requestAnimationFrame(updateWithRAF);
    };
    this.animationFrameId = requestAnimationFrame(updateWithRAF);
  }

  cleanupVideoListeners(): void {
    if (!this.videoPlayer) return;

    if (this.timeUpdateHandler) {
      this.videoPlayer.removeEventListener('timeupdate', this.timeUpdateHandler);
    }
    if (this.progressHandler) {
      this.videoPlayer.removeEventListener('progress', this.progressHandler);
    }
    if (this.playingHandler) {
      this.videoPlayer.removeEventListener('playing', this.playingHandler);
    }
    if (this.seekedHandler) {
      this.videoPlayer.removeEventListener('seeked', this.seekedHandler);
    }
    if (this.loadedMetadataHandler) {
      this.videoPlayer.removeEventListener('loadedmetadata', this.loadedMetadataHandler);
    }
  }

  observeVideoPlayer(_onVideoFound: () => void): void {
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

  cleanup(): void {
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

