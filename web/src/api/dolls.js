import { api } from './client';

// Dolls of users, loaded once per user and shared by every avatar on the page.
// The feed shows the same authors many times, so each doll is requested only once.
const cache = new Map();

export function getUserDoll(userId) {
  if (!cache.has(userId)) {
    const promise = api.get(`/users/${userId}/doll`).catch(() => {
      // Do not keep a failed request: the next avatar will try again.
      cache.delete(userId);
      return null;
    });
    cache.set(userId, promise);
  }
  return cache.get(userId);
}

// Call after the user changes their doll or the "doll as avatar" switch.
export function forgetUserDoll(userId) {
  cache.delete(userId);
}

// The public catalog of doll parts (GET /api/doll-parts), loaded once.
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
