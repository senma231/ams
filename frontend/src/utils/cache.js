// 缓存键前缀
const CACHE_PREFIX = 'asset_mgr_';

// 默认缓存时间（1小时）
const DEFAULT_CACHE_TIME = 60 * 60 * 1000;

/**
 * 设置缓存
 * @param {string} key 缓存键
 * @param {any} value 缓存值
 * @param {number} expire 过期时间（毫秒）
 */
export function setCache(key, value, expire = DEFAULT_CACHE_TIME) {
  const cacheKey = CACHE_PREFIX + key;
  const data = {
    value,
    expire: expire ? new Date().getTime() + expire : null
  };
  localStorage.setItem(cacheKey, JSON.stringify(data));
}

/**
 * 获取缓存
 * @param {string} key 缓存键
 * @returns {any} 缓存值
 */
export function getCache(key) {
  const cacheKey = CACHE_PREFIX + key;
  const data = localStorage.getItem(cacheKey);
  if (data) {
    try {
      const { value, expire } = JSON.parse(data);
      // 检查是否过期
      if (expire === null || expire >= new Date().getTime()) {
        return value;
      }
      // 已过期，删除缓存
      removeCache(key);
    } catch (e) {
      removeCache(key);
    }
  }
  return null;
}

/**
 * 移除缓存
 * @param {string} key 缓存键
 */
export function removeCache(key) {
  const cacheKey = CACHE_PREFIX + key;
  localStorage.removeItem(cacheKey);
}

/**
 * 清除所有缓存
 */
export function clearCache() {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * 获取所有缓存键
 * @returns {string[]} 缓存键数组
 */
export function getCacheKeys() {
  return Object.keys(localStorage)
    .filter(key => key.startsWith(CACHE_PREFIX))
    .map(key => key.slice(CACHE_PREFIX.length));
}

/**
 * 缓存装饰器
 * @param {string} key 缓存键
 * @param {number} expire 过期时间（毫秒）
 * @returns {Function} 装饰器函数
 */
export function withCache(key, expire = DEFAULT_CACHE_TIME) {
  return function(target, name, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const cacheKey = `${key}_${JSON.stringify(args)}`;
      const cachedValue = getCache(cacheKey);

      if (cachedValue !== null) {
        return cachedValue;
      }

      const result = await originalMethod.apply(this, args);
      setCache(cacheKey, result, expire);
      return result;
    };

    return descriptor;
  };
} 