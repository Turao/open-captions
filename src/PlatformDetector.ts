import type { StreamingPlatformClass, StreamingPlatformInstance } from './types';

export class PlatformDetector {
  static platforms: StreamingPlatformClass[] = [];

  static register(PlatformClass: StreamingPlatformClass): void {
    this.platforms.push(PlatformClass);
  }

  static detect(): StreamingPlatformInstance | null {
    for (const PlatformClass of this.platforms) {
      const platform = new PlatformClass();
      if (platform.detect()) {
        return platform;
      }
    }
    return null;
  }
}

