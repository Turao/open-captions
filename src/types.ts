export interface Subtitle {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

export interface StreamingPlatformClass {
  new (): StreamingPlatformInstance;
}

export interface StreamingPlatformInstance {
  videoPlayer: HTMLVideoElement | null;
  videoPlayerFound?: boolean;
  detect(): boolean;
  findVideoPlayer(): HTMLVideoElement | null;
  getCurrentTime(): number | null;
  getDuration(): number | null;
  setupVideoListeners(onUpdate: () => void): void;
  cleanupVideoListeners(): void;
  observeVideoPlayer(onVideoFound: () => void): void;
  cleanup(): void;
}

