class NetflixPlatform extends StreamingPlatform {
  detect() {
    return window.location.hostname.includes("netflix.com");
  }

  findVideoInShadowDOM(root) {
    // Search for video elements in shadow DOM
    let video = root.querySelector("video");
    if (video) return video;

    // Recursively search shadow roots
    const shadowRoots = Array.from(root.querySelectorAll("*"))
      .map((el) => el.shadowRoot)
      .filter(Boolean);

    for (const shadowRoot of shadowRoots) {
      video = this.findVideoInShadowDOM(shadowRoot);
      if (video) return video;
    }

    return null;
  }

  findVideoPlayer() {
    // Try to find video element using multiple strategies
    let videoElement = null;
    let bestCandidate = null;
    let bestScore = -1;

    // Score function to prioritize better video elements
    const scoreVideo = (video) => {
      let score = 0;
      if (video.readyState >= 2) score += 10; // Has loaded metadata
      if (video.duration > 0) score += 5; // Has duration
      if (!video.paused) score += 20; // Is playing
      if (video.currentTime > 0) score += 5; // Has progressed
      if (video.offsetWidth > 0 && video.offsetHeight > 0) score += 10; // Is visible
      return score;
    };

    // Strategy 1: Try standard selectors
    const selectors = [
      "video",
      ".VideoContainer video",
      ".player-video-wrapper video",
      ".watch-video video",
      "[data-uia='video-player'] video",
      "video[data-uia='video-player']",
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const score = scoreVideo(el);
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = el;
        }
      }
    }

    if (bestCandidate && bestScore > 0) {
      videoElement = bestCandidate;
    }

    // Strategy 2: Search in shadow DOM
    if (!videoElement) {
      videoElement = this.findVideoInShadowDOM(document);
    }

    // Strategy 3: Try Netflix's player API (if available)
    if (!videoElement && window.netflix) {
      try {
        const playerAPI = window.netflix.appContext?.state?.playerApp?.getAPI?.();
        if (playerAPI) {
          const session = playerAPI.videoPlayer?.getAllPlayerSessionIds?.()?.[0];
          if (session) {
            const player = playerAPI.videoPlayer?.getVideoPlayerBySessionId?.(session);
            if (player) {
              // Try to get the video element from the player
              const videoEl = player.getVideoElement?.();
              if (videoEl) {
                videoElement = videoEl;
              }
            }
          }
        }
      } catch (e) {
        console.log("Netflix API access failed:", e);
      }
    }

    // Strategy 4: Find video by checking all video elements and their properties
    if (!videoElement) {
      const allVideos = document.querySelectorAll("video");
      for (const video of allVideos) {
        const score = scoreVideo(video);
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = video;
        }
      }
      if (bestCandidate) {
        videoElement = bestCandidate;
      }
    }

    // Only update if we found a different video element or don't have one yet
    // Also re-check if current video element seems invalid
    const shouldUpdate = 
      (videoElement && videoElement !== this.videoPlayer) ||
      (this.videoPlayer && (
        isNaN(this.videoPlayer.currentTime) ||
        this.videoPlayer.readyState === 0 ||
        (this.videoPlayer.offsetWidth === 0 && this.videoPlayer.offsetHeight === 0)
      ));

    if (shouldUpdate && videoElement) {
      // Clean up old listeners
      if (this.videoPlayer) {
        this.cleanupVideoListeners();
      }

      this.videoPlayer = videoElement;

      // Log for debugging
      console.log("Netflix video player found:", this.videoPlayer, {
        currentTime: this.videoPlayer.currentTime,
        duration: this.videoPlayer.duration,
        paused: this.videoPlayer.paused,
        readyState: this.videoPlayer.readyState,
        dimensions: `${this.videoPlayer.offsetWidth}x${this.videoPlayer.offsetHeight}`,
      });

      return videoElement;
    }

    return this.videoPlayer;
  }

  getCurrentTime() {
    // Try multiple methods to get the current playback time
    
    // Method 1: Direct video element access
    if (this.videoPlayer) {
      const videoTime = this.videoPlayer.currentTime;
      if (!isNaN(videoTime) && videoTime !== undefined && videoTime !== null) {
        return videoTime;
      }
    }

    // Method 2: Try Netflix's player API
    try {
      if (window.netflix) {
        // Try different API paths that Netflix might use
        const appContext = window.netflix.appContext;
        if (appContext) {
          // Path 1: Standard player API
          const playerApp = appContext.state?.playerApp;
          if (playerApp) {
            const playerAPI = playerApp.getAPI?.();
            if (playerAPI && playerAPI.videoPlayer) {
              const sessionIds = playerAPI.videoPlayer.getAllPlayerSessionIds?.();
              if (sessionIds && sessionIds.length > 0) {
                const player = playerAPI.videoPlayer.getVideoPlayerBySessionId?.(sessionIds[0]);
                if (player) {
                  const currentTimeMs = player.getCurrentTime?.();
                  if (currentTimeMs !== undefined && currentTimeMs !== null && !isNaN(currentTimeMs)) {
                    return currentTimeMs / 1000; // Convert from milliseconds
                  }
                }
              }
            }
          }

          // Path 2: Try accessing through player state
          const playerState = appContext.state?.playerApp?.getState?.();
          if (playerState && playerState.videoPlayer) {
            const sessionIds = Object.keys(playerState.videoPlayer);
            if (sessionIds.length > 0) {
              const session = playerState.videoPlayer[sessionIds[0]];
              if (session && session.state && session.state.currentTime !== undefined) {
                return session.state.currentTime / 1000;
              }
            }
          }
        }
      }
    } catch (e) {
      // Silently fail - we'll try other methods
    }

    // Method 3: Try to find and read from any visible playing video
    const allVideos = document.querySelectorAll("video");
    for (const video of allVideos) {
      if (!video.paused && video.readyState >= 2) {
        const time = video.currentTime;
        if (!isNaN(time) && time !== undefined && time !== null) {
          return time;
        }
      }
    }

    return null;
  }

  getDuration() {
    // Try to get duration from video element first
    if (this.videoPlayer && !isNaN(this.videoPlayer.duration)) {
      return this.videoPlayer.duration;
    }

    // Try to get duration from Netflix API
    try {
      if (window.netflix) {
        const playerAPI = window.netflix.appContext?.state?.playerApp?.getAPI?.();
        if (playerAPI) {
          const session = playerAPI.videoPlayer?.getAllPlayerSessionIds?.()?.[0];
          if (session) {
            const player = playerAPI.videoPlayer?.getVideoPlayerBySessionId?.(session);
            if (player) {
              const seekableRange = player.getSeekableRange?.();
              if (seekableRange && seekableRange.end !== undefined) {
                return seekableRange.end / 1000;
              }
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }

    return null;
  }

  observeVideoPlayer(onVideoFound) {
    // Add a delay before watching for video player to avoid triggering Netflix's security
    setTimeout(() => {
      super.observeVideoPlayer(() => {
        if (this.videoPlayer && !this.videoPlayerFound) {
          this.videoPlayerFound = true;
          onVideoFound();
        }
      });
    }, 2000); // Wait 2 seconds before initializing
  }
}

// Auto-register with PlatformDetector when loaded
if (typeof PlatformDetector !== "undefined") {
  PlatformDetector.register(NetflixPlatform);
}
