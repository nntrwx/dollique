import { api } from '../api/client';

// clicking the same vote again removes it
export function nextVote(current, clicked) {
  const next = current === clicked ? null : clicked;
  const value = (vote) => (vote === 'like' ? 1 : vote === 'dislike' ? -1 : 0);
  return { next, delta: value(next) - value(current) };
}

export function sendVote(basePath, next) {
  return next ? api.post(`${basePath}/like`, { type: next }) : api.delete(`${basePath}/like`);
}

export function findMyVote(likes, userId) {
  if (!userId || !Array.isArray(likes)) return null;
  return likes.find((like) => like.authorId === userId)?.type || null;
}
