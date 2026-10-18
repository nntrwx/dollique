import { api } from '../api/client';

// Likes and dislikes work the same way for posts and comments:
// clicking your current vote removes it, clicking the other one switches it.
// Returns the new vote ('like', 'dislike' or null) and how the score changes.
export function nextVote(current, clicked) {
  const next = current === clicked ? null : clicked;
  const value = (vote) => (vote === 'like' ? 1 : vote === 'dislike' ? -1 : 0);
  return { next, delta: value(next) - value(current) };
}

// Sends the vote to the API. basePath is '/posts/5' or '/comments/12'.
export function sendVote(basePath, next) {
  return next ? api.post(`${basePath}/like`, { type: next }) : api.delete(`${basePath}/like`);
}

// Finds the vote of the user in a list from GET /.../like.
export function findMyVote(likes, userId) {
  if (!userId || !Array.isArray(likes)) return null;
  return likes.find((like) => like.authorId === userId)?.type || null;
}
