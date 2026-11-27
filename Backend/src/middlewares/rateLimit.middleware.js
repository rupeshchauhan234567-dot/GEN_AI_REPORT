const buckets = new Map();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 180;

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_REQUESTS = 12;

function createLimiter({ windowMs, maxRequests, message }) {
  return function limiter(req, res, next) {
    const key = `${req.ip || req.socket?.remoteAddress || "unknown"}:${req.baseUrl}${req.path}`;
    const now = Date.now();

    let bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      bucket = {
        count: 0,
        resetAt: now + windowMs
      };
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (buckets.size > 10000) {
      for (const [entryKey, value] of buckets) {
        if (now >= value.resetAt) buckets.delete(entryKey);
      }
    }

    res.setHeader("RateLimit-Limit", String(maxRequests));
    res.setHeader(
      "RateLimit-Remaining",
      String(Math.max(0, maxRequests - bucket.count))
    );

    if (bucket.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message
      });
    }

    return next();
  };
}

const apiRateLimit = createLimiter({
  windowMs: WINDOW_MS,
  maxRequests: MAX_REQUESTS,
  message: "Too many requests. Please try again later."
});

const authRateLimit = createLimiter({
  windowMs: AUTH_WINDOW_MS,
  maxRequests: AUTH_MAX_REQUESTS,
  message: "Too many authentication requests. Please wait before trying again."
});

module.exports = apiRateLimit;
module.exports.authRateLimit = authRateLimit;