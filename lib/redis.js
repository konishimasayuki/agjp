import { Redis } from '@upstash/redis';

// Upstash 直結の環境変数 / Vercel Marketplace 経由の環境変数どちらにも対応
export function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export const PREFIX = process.env.AG_KEY_PREFIX || 'ag:';
