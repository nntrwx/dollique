import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useSelector } from 'react-redux';
import {
  Link, useLocation, useNavigate, useParams,
} from 'react-router-dom';

import { api } from '../api/client';
import { getUserDoll } from '../api/dolls';
import Avatar from '../components/Avatar';
import CommentForm from '../components/CommentForm';
import CommentItem from '../components/CommentItem';
import ConfirmButton from '../components/ConfirmButton';
import Dropdown from '../components/Dropdown';
import DollFigure from '../components/DollFigure';
import ImageGallery from '../components/ImageGallery';
import ModerationNotice from '../components/ModerationNotice';
import Pixel from '../components/Pixel';
import VoteButtons from '../components/VoteButtons';
import usePolling from '../hooks/usePolling';
import { selectCurrentUser } from '../store/authSlice';
import { formatDate, formatDateTime, plural, realName } from '../utils/format';
import {
  findMyVote, nextVote, sendVote,
} from '../utils/votes';
import './PostPage.css';

const LIVE_MS = 8000;

const COMMENT_SORTS = {
  'likes-asc': { label: 'Likes', dir: 'ascending ↑', compare: (a, b) => a.netLikes - b.netLikes },
  'likes-desc': { label: 'Likes', dir: 'descending ↓', compare: (a, b) => b.netLikes - a.netLikes },
  oldest: { label: 'Date', dir: 'oldest first', compare: (a, b) => new Date(a.createdAt) - new Date(b.createdAt) },
  newest: { label: 'Date', dir: 'newest first', compare: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
};

function flatten(comments) {
  return comments.flatMap((comment) => [comment, ...flatten(comment.replies || [])]);
}

function updateInTree(comments, id, fn) {
  return comments.map((comment) => {
    if (comment.id === id) return fn(comment);
    return { ...comment, replies: updateInTree(comment.replies || [], id, fn) };
  });
}

function AuthorCard({ post }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.get(`/users/${post.authorId}`).catch(() => null),
      getUserDoll(post.authorId),
      api.get('/posts', { author: post.authorId, limit: 1 }).catch(() => null),
    ]).then(([profile, doll, posts]) => {
      if (!ignore) setInfo({ profile, layers: doll?.layers || [], posts: posts?.pagination.total ?? null });
    });
    return () => {
      ignore = true;
    };
  }, [post.authorId]);

  const name = post.author?.login || 'deleted user';
  const fullName = post.author ? realName(post.author) : '';

  return (
    <div className="panel author">
      <div className="author__stage">
        {info?.layers.length ? (
          <DollFigure layers={info.layers} label={`${name}'s doll`} />
        ) : (
          <Avatar src={post.author?.profilePicture} alt={name} size={120} className="author__photo" />
        )}
      </div>
      <div className="mono">asked by</div>
      <h3>{fullName || name}</h3>
      {fullName && (
        <div className="handle">
          <i>@</i>
          {name}
        </div>
      )}
      <div className="author__nums mono">
        <span>
          <b>{post.author?.rating ?? 0}</b>
          rating
        </span>
        <span>
          <b>{info?.posts ?? '·'}</b>
          posts
        </span>
        <span>
          <b>{info?.profile ? new Date(info.profile.created_at).toLocaleDateString('en-GB', { month: 'short' }) : '·'}</b>
          joined
        </span>
      </div>
      <Link to={`/users/${post.authorId}`} className="nbtn nbtn--sm">Open profile</Link>
    </div>
  );
}

function RelatedPosts({ post }) {
  const [related, setRelated] = useState([]);
  const categoryId = post.categories[0]?.id;

  useEffect(() => {
    if (!categoryId) return undefined;
    let ignore = false;
    api.get('/posts', { categories: categoryId, limit: 4, sort: 'likes' })
      .then((data) => {
        if (!ignore) setRelated(data.posts.filter((item) => item.id !== post.id).slice(0, 3));
      })
      .catch(() => setRelated([]));
    return () => {
      ignore = true;
    };
  }, [categoryId, post.id]);

  if (!related.length) return null;

  return (
    <div className="panel related">
      <div className="mono">{`also in ${post.categories[0].title}`}</div>
      <h3>Related</h3>
      {related.map((item) => (
        <Link key={item.id} to={`/posts/${item.id}`}>
          {item.title}
          <small className="mono">{`${item.author?.login || 'deleted user'} · ${plural(item.commentsCount, 'comment')}`}</small>
        </Link>
      ))}
    </div>
  );
}

function PostPage() {
  const { id } = useParams();
  const user = useSelector(selectCurrentUser);
  const userId = user?.id;
  const navigate = useNavigate();
  const location = useLocation();

  const [post, setPost] = useState(null);
  const postId = post?.id;
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [myVote, setMyVote] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savePop, setSavePop] = useState(false);
  const [comments, setComments] = useState([]);
  const [myCommentVotes, setMyCommentVotes] = useState({});
  const [commentSort, setCommentSort] = useState('likes-asc');
  const [hideReason, setHideReason] = useState(null); // null = form closed
  const [copied, setCopied] = useState(false);

  const loadPost = useCallback(async () => {
    const data = await api.get(`/posts/${id}`);
    setPost(data);
    setMyVote(findMyVote(data.likes, userId));
  }, [id, userId]);

  const votesRef = useRef({});
  useEffect(() => {
    votesRef.current = myCommentVotes;
  }, [myCommentVotes]);

  const loadComments = useCallback(async () => {
    const tree = await api.get(`/posts/${id}/comments`);
    setComments(tree);
    if (!userId) {
      setMyCommentVotes({});
      return;
    }
    // The API has no "my vote" field for comments, so we read the likes of each one.
    const entries = await Promise.all(flatten(tree).map(async (comment) => {
      const likes = await api.get(`/comments/${comment.id}/like`).catch(() => []);
      return [comment.id, findMyVote(likes, userId)];
    }));
    setMyCommentVotes(Object.fromEntries(entries));
  }, [id, userId]);

  useEffect(() => {
    setPost(null);
    setLoadError('');
    loadPost()
      .then(loadComments)
      .catch((err) => setLoadError(err.status === 404 ? 'This post does not exist or is hidden.' : err.message));
  }, [loadPost, loadComments]);

  // New comments, replies, likes and edits from other people show up on their own.
  const refreshLive = useCallback(async () => {
    try {
      const [data, tree] = await Promise.all([api.get(`/posts/${id}`), api.get(`/posts/${id}/comments`)]);
      setPost(data);
      setMyVote(findMyVote(data.likes, userId));
      setComments(tree);
      if (!userId) return;
      const fresh = flatten(tree).filter((comment) => !(comment.id in votesRef.current));
      if (fresh.length === 0) return;
      const entries = await Promise.all(fresh.map(async (comment) => {
        const likes = await api.get(`/comments/${comment.id}/like`).catch(() => []);
        return [comment.id, findMyVote(likes, userId)];
      }));
      setMyCommentVotes((votes) => ({ ...votes, ...Object.fromEntries(entries) }));
    } catch {
      // a failed refresh changes nothing; the next one tries again
    }
  }, [id, userId]);
  usePolling(post ? refreshLive : null, LIVE_MS);

  useEffect(() => {
    if (!userId) {
      setIsFavorite(false);
      return;
    }
    api.get('/posts/favorites')
      .then((list) => setIsFavorite(list.some((item) => item.id === Number(id))))
      .catch(() => setIsFavorite(false));
  }, [id, userId]);

  // Opening /posts/1#comments scrolls to the comments once they are on the page.
  useEffect(() => {
    if (postId && location.hash) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.querySelector(location.hash)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, [postId, location.hash]);

  // Runs an API action and shows its error above the post instead of failing silently.
  const run = async (action) => {
    setActionError('');
    try {
      await action();
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (loadError) {
    return (
      <section className="page glass page--center">
        <h1 className="page__title">Post not found</h1>
        <p className="page__lead">{loadError}</p>
        <Link to="/" className="nbtn">Back to the feed</Link>
      </section>
    );
  }

  if (!post) {
    return (
      <div className="pcols pcols--loading" aria-label="Loading the post">
        <div className="skeleton" style={{ height: 520 }} />
        <div className="skeleton" style={{ height: 360 }} />
      </div>
    );
  }

  const isAuthor = user?.id === post.authorId;
  const isAdmin = user?.role === 'admin';
  const isActive = post.status === 'active';
  const edited = new Date(post.updatedAt) - new Date(post.createdAt) > 1000;
  const authorName = post.author?.login || 'deleted user';
  const sortComments = (list) => [...list].sort(COMMENT_SORTS[commentSort].compare);
  const commentsTotal = flatten(comments).length;
  const paragraphs = post.content.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  const votePost = (type) => run(async () => {
    const { next, delta } = nextVote(myVote, type);
    await sendVote(`/posts/${post.id}`, next);
    setMyVote(next);
    setPost((current) => ({ ...current, netLikes: current.netLikes + delta }));
  });

  const toggleFavorite = () => run(async () => {
    const data = await api.post(`/posts/${post.id}/favorite`);
    setIsFavorite(data.isFavorite);
    setSavePop(data.isFavorite);
  });

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split('#')[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setActionError('Could not copy the link. Copy it from the address bar.');
    }
  };

  const setStatus = (status, reason) => run(async () => {
    await api.patch(`/posts/${post.id}`, reason ? { status, reason } : { status });
    setHideReason(null);
    await loadPost();
  });

  const deletePost = () => run(async () => {
    await api.delete(`/posts/${post.id}`);
    navigate('/', { replace: true });
  });

  // Everything comments need, passed down the tree in one object.
  const thread = {
    user,
    postAuthorId: post.authorId,
    canWrite: Boolean(user) && (isActive || isAdmin),
    myVotes: myCommentVotes,
    sort: sortComments,
    onVote: (comment, type) => run(async () => {
      const { next, delta } = nextVote(myCommentVotes[comment.id] || null, type);
      await sendVote(`/comments/${comment.id}`, next);
      setMyCommentVotes((votes) => ({ ...votes, [comment.id]: next }));
      setComments((tree) => updateInTree(tree, comment.id, (c) => ({ ...c, netLikes: c.netLikes + delta })));
    }),
    onReply: async (parentId, content) => {
      await api.post(`/posts/${post.id}/comments`, { content, parent_id: parentId });
      await loadComments();
    },
    onEdit: async (commentId, content) => {
      await api.patch(`/comments/${commentId}`, { content });
      await loadComments();
    },
    onDelete: (commentId) => run(async () => {
      await api.delete(`/comments/${commentId}`);
      await loadComments();
    }),
    onToggleStatus: (comment) => run(async () => {
      await api.patch(`/comments/${comment.id}`, { status: comment.status === 'active' ? 'inactive' : 'active' });
      await loadComments();
    }),
  };

  let voteHint = 'Sign in to vote';
  if (user && !isActive) voteHint = 'Hidden posts cannot be voted on';

  return (
    <div className="article">
      <div className="crumbs mono">
        <button type="button" className="link-button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>← Back</button>
        <span>/</span>
        <Link to="/">Feed</Link>
        {post.categories[0] && (
          <>
            <span>/</span>
            <Link to={`/?categories=${post.categories[0].id}`}>{post.categories[0].title}</Link>
          </>
        )}
        <span>/</span>
        <span>{`post № ${post.id}`}</span>
      </div>

      {actionError && <p className="alert alert--error">{actionError}</p>}

      {post.moderation && (isAuthor || isAdmin) && (
        <ModerationNotice
          post={post}
          isAuthor={isAuthor}
          isAdmin={isAdmin}
          onChanged={loadPost}
          onDeleted={() => navigate('/', { replace: true })}
        />
      )}

      {!isActive && !post.moderation && isAdmin && !isAuthor && (
        <p className="alert">The author hid this post. Only they and admins can see it.</p>
      )}

      {!isActive && !post.moderation && isAuthor && (
        <p className="alert">
          Only you can see this post right now.
          {' '}
          <button type="button" className="link-button" onClick={() => setStatus('active')}>Publish it again ✦</button>
        </p>
      )}

      <div className="pcols">
        <main>
          <div className="ptop">
            {isActive ? (
              <span className="status">active</span>
            ) : (
              <span className="status status--inactive" title="Only the author and admins can see this post">
                <Pixel name="eyeOff" size={9} />
                hidden
              </span>
            )}
            {post.categories.map((category) => (
              <Link key={category.id} to={`/?categories=${category.id}`} className="tag" title={category.description}>{category.title}</Link>
            ))}
          </div>
          <h1 className="ptitle">{post.title}</h1>
          <div className="pmeta">
            <Link to={`/users/${post.authorId}`} className="pmeta__author">
              <Avatar src={post.author?.profilePicture} alt={authorName} size={38} userId={post.authorId} />
              <span>
                <b>{(post.author && realName(post.author)) || authorName}</b>
                {post.author && realName(post.author) && (
                  <span className="handle">
                    <i>@</i>
                    {authorName}
                  </span>
                )}
                <br />
                <span className="pmeta__rate">{`✦ ${post.author?.rating ?? 0} rating`}</span>
              </span>
            </Link>
            <time className="mono" dateTime={post.createdAt}>
              {formatDateTime(post.createdAt)}
              {edited && <small>{`edited ${formatDate(post.updatedAt)}`}</small>}
            </time>
          </div>

          <ImageGallery images={post.images} title={post.title} />

          <div className={`pbody${post.images.length ? '' : ' pbody--plain'}`}>
            {paragraphs.map((text, index) => <p key={index}>{text}</p>)}
          </div>

          <div className="pactions">
            <VoteButtons
              score={post.netLikes}
              myVote={myVote}
              onVote={user && isActive ? votePost : null}
              disabledReason={voteHint}
            />
            {/* round icon buttons: the label slides out on hover */}
            {user && (
              <button
                type="button"
                className={`ibtn ibtn--save${isFavorite ? ' on' : ''}${savePop ? ' ibtn--pop' : ''}`}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? 'Remove from saved' : 'Save the post'}
                onClick={toggleFavorite}
              >
                <Pixel name={isFavorite ? 'bookmarkOn' : 'bookmark'} size={15} />
                <span className="ibtn__label">{isFavorite ? 'Saved' : 'Save'}</span>
              </button>
            )}
            <button
              type="button"
              className={`ibtn ibtn--share${copied ? ' ibtn--sent' : ''}`}
              aria-label="Copy the link to the post"
              onClick={share}
            >
              <Pixel name="plane" size={14} />
              <span className="ibtn__label" aria-live="polite">{copied ? 'Link copied ✓' : 'Share'}</span>
            </button>

            <span className="pactions__own">
              {isAuthor && isActive && <Link to={`/posts/${post.id}/edit`} className="link-button">Edit</Link>}
              {isAuthor && isActive && (
                <button type="button" className="link-button" onClick={() => setStatus('inactive')}>Make inactive</button>
              )}
              {isAdmin && !isAuthor && isActive && hideReason === null && (
                <button type="button" className="link-button" onClick={() => setHideReason('')}>Hide</button>
              )}
              {isAdmin && !isAuthor && !isActive && (
                <button type="button" className="link-button" onClick={() => setStatus('active')}>Restore</button>
              )}
              {(isAuthor || isAdmin) && (
                <ConfirmButton className="link-button link-button--danger" question="Delete this post?" confirmLabel="Delete" onConfirm={deletePost}>
                  Delete
                </ConfirmButton>
              )}
            </span>
          </div>

          {hideReason !== null && (
            <form
              className="hideform"
              onSubmit={(event) => {
                event.preventDefault();
                setStatus('inactive', hideReason.trim());
              }}
            >
              <div className="inp">
                <input
                  placeholder="Reason for the author (optional)"
                  aria-label="Reason for the author"
                  maxLength={500}
                  value={hideReason}
                  onChange={(event) => setHideReason(event.target.value)}
                />
              </div>
              <button type="submit" className="nbtn nbtn--danger nbtn--sm">Hide post</button>
              <button type="button" className="link-button" onClick={() => setHideReason(null)}>Cancel</button>
            </form>
          )}

          <section id="comments">
            <div className="chead">
              <h2>
                Comments
                <sup>{commentsTotal}</sup>
              </h2>
              {commentsTotal > 1 && (
                <div className="chead__sort">
                  <span className="mono">sort</span>
                  <Dropdown
                    ariaLabel="Sort comments"
                    className="dd--right"
                    value={commentSort}
                    options={Object.entries(COMMENT_SORTS).map(([key, sort]) => ({ value: key, label: `${sort.label}: ${sort.dir}` }))}
                    onChange={setCommentSort}
                  />
                </div>
              )}
            </div>

            {thread.canWrite && (
              <div className="compose glass">
                <Avatar src={user.profilePicture} alt={user.login} size={38} userId={user.id} />
                <CommentForm
                  submitLabel="Comment"
                  onSubmit={async (content) => {
                    await api.post(`/posts/${post.id}/comments`, { content });
                    await loadComments();
                  }}
                />
              </div>
            )}
            {!user && (
              <p className="alert">
                <Link to="/login" state={{ from: location }} className="auth__link">Sign in</Link>
                {' to join the discussion.'}
              </p>
            )}
            {user && !thread.canWrite && <p className="alert">Comments are closed while the post is hidden.</p>}

            {commentsTotal === 0 ? (
              <p className="cempty">
                <Pixel name="bubble" color="#c98a9c" size={14} />
                No comments yet. Be the first to answer.
              </p>
            ) : (
              <div className="ctree">
                {sortComments(comments).map((comment) => (
                  <div key={comment.id} className="thread glass">
                    <CommentItem comment={comment} thread={thread} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="pside">
          <AuthorCard post={post} />
          <RelatedPosts post={post} />
        </aside>
      </div>
    </div>
  );
}

export default PostPage;
