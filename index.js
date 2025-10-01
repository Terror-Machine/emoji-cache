const fs = require("fs");
const path = require("path");

class OptimizedEmojiCache {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 200;
    this.emojiFilesDir = path.join(__dirname, "./emoji/");
    this.emojiJsonByBrand = { apple: 'emoji-apple-image.json' };
    this.fileHandles = new Map();
    this.fileContent = new Map();
    this.initialized = false;
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0
    };
    this.popularEmojis = [
      '2614', '2615', '2648', '2649', '2650',
      '2661', '2662', '2663', '2664', '2665',
      '26A0', '26A1', '2600', '2601', '2602',
      '2764', '2665', '2666', '2667', '2668'
    ];
  }
  async init() {
    if (this.initialized) return;
    try {
      for (const [brand, filename] of Object.entries(this.emojiJsonByBrand)) {
        const filePath = path.resolve(this.emojiFilesDir, filename);
        if (fs.existsSync(filePath)) {
          this.fileHandles.set(brand, { filePath });
          const content = await fs.promises.readFile(filePath, 'utf8');
          this.fileContent.set(brand, content);
          console.log(`Emoji cache initialized for ${brand}`);
        } else {
          console.warn(`Emoji file tidak ditemukan: ${filePath}`);
        }
      }
      this.initialized = true;
      await this.preloadPopularEmojis();
    } catch (error) {
      console.error('Failed to initialize emoji cache:', error);
      throw error;
    }
  }
  async preloadPopularEmojis() {
    console.log(`Preloading ${this.popularEmojis.length} popular emojis...`);
    try {
      let preloadedCount = 0;
      for (const unicode of this.popularEmojis) {
        const base64 = this.getEmojiSync('apple', unicode);
        if (base64) preloadedCount++;
      }
      console.log(`Preloaded ${preloadedCount}/${this.popularEmojis.length} popular emojis`);
    } catch (error) {
      console.warn('Could not preload popular emojis:', error.message);
    }
  }
  getEmojiSync(brand, unicode) {
    if (!this.initialized) {
      throw new Error('Emoji cache not initialized. Call init() first.');
    }
    this.stats.totalRequests++;
    const cacheKey = `${brand}:${unicode}`;
    if (this.cache.has(cacheKey)) {
      this.stats.hits++;
      this.moveToFront(cacheKey);
      return this.cache.get(cacheKey);
    }
    this.stats.misses++;
    const content = this.fileContent.get(brand);
    if (!content) return null;
    const base64Data = this.extractEmojiFromContent(content, unicode);
    if (base64Data) {
      this.addToCache(cacheKey, base64Data);
      return base64Data;
    }
    return null;
  }
  extractEmojiFromContent(content, unicode) {
    try {
      const searchPattern = `"${unicode}":`;
      const startIndex = content.indexOf(searchPattern);
      if (startIndex === -1) return null;
      const valueStart = startIndex + searchPattern.length;
      let quoteStart = content.indexOf('"', valueStart);
      if (quoteStart === -1) return null;
      quoteStart++;
      let valueEnd = quoteStart;
      let escapeNext = false;
      while (valueEnd < content.length) {
        const char = content[valueEnd];
        if (escapeNext) {
          escapeNext = false;
        } else if (char === '\\') {
          escapeNext = true;
        } else if (char === '"') {
          break;
        }
        valueEnd++;
      }
      return content.substring(quoteStart, valueEnd);
    } catch (error) {
      console.error(`Error extracting emoji ${unicode}:`, error);
      return null;
    }
  }
  addToCache(key, data) {
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, data);
  }
  moveToFront(key) {
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
  }
  getStats() {
    const hitRate = this.stats.totalRequests > 0
      ? ((this.stats.hits / this.stats.totalRequests) * 100).toFixed(1)
      : '0';
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize
    };
  }
  clearCache() {
    this.cache.clear();
    console.log('Emoji cache cleared');
  }
}
const optimizedEmojiCache = new OptimizedEmojiCache();
function createBrandProxy(brand) {
  return new Proxy({}, {
    get: function (target, prop) {
      if (typeof prop === 'string') {
        return optimizedEmojiCache.getEmojiSync(brand, prop);
      }
      return undefined;
    },
    has: function (target, prop) {
      return typeof prop === 'string';
    },
    ownKeys: function (target) {
      return [];
    },
    getOwnPropertyDescriptor: function (target, prop) {
      return {
        enumerable: true,
        configurable: true
      };
    }
  });
}
const emojiImageByBrandPromise = (async () => {
  await optimizedEmojiCache.init();
  return {
    apple: createBrandProxy('apple'),
    _getStats: () => optimizedEmojiCache.getStats(),
    _clearCache: () => optimizedEmojiCache.clearCache()
  };
})();

module.exports = emojiImageByBrandPromise;