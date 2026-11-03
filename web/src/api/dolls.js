import { api } from './client';

const cache = new Map();

export function getUserDoll(userId) {
  if (!cache.has(userId)) {
    const promise = api.get(`/users/${userId}/doll`).catch(() => {
      // don't cache failed requests
      cache.delete(userId);
      return null;
    });
    cache.set(userId, promise);
  }
  return cache.get(userId);
}

export function forgetUserDoll(userId) {
  cache.delete(userId);
}

let partsPromise = null;

export function getDollParts() {
  if (!partsPromise) {
    partsPromise = api.get('/doll-parts').catch((error) => {
      partsPromise = null;
      throw error;
    });
  }
  return partsPromise;
}
