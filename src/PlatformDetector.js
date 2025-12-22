class PlatformDetector {
  static platforms = [];

  static register(PlatformClass) {
    this.platforms.push(PlatformClass);
  }

  static detect() {
    for (const PlatformClass of this.platforms) {
      const platform = new PlatformClass();
      if (platform.detect()) {
        return platform;
      }
    }
    return null;
  }
}