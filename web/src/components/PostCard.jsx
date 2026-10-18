import { Link } from 'react-router-dom';

import { excerpt, formatDateTime, plural } from '../utils/format';
import Avatar from './Avatar';
import { Sparkle } from './Doodle';
import Pixel from './Pixel';
import './PostCard.css';

// Post preview: picture, author with rating, date, status, title, short text, categories,
// likes and comments (the task asks to show every field of a post in the preview).
// `actions` adds owner links (profile page), `compact` makes the card smaller.
function PostCard({
  post, onCategoryClick = null, actions = null, compact = false, showAuthor = true,
}) {
  const cover = post.images?.[0];
  const authorName = post.author?.login || 'deleted user';
  const hidden = post.status === 'inactive';

  return (
    <article className={`post${compact ? ' post--compact' : ''}${cover ? '' : ' post--text'}${hidden ? ' post--hidden' : ''}`}>
      <Sparkle />
      {/* a post without photos is just text, without an empty picture box */}
      {cover && (
        <Link to={`/posts/${post.id}`} className="post__pic" tabIndex={-1} aria-hidden="true">
          <img src={cover} alt="" loading="lazy" />
          {post.images.length > 1 && <span className="post__more">{`+${post.images.length - 1}`}</span>}
        </Link>
      )}

      <div className="post__body">
        <div className="post__meta">
          {showAuthor && (
            <Link to={`/users/${post.authorId}`} className="post__author">
              <Avatar src={post.author?.profilePicture} alt={authorName} size={30} userId={post.authorId} />
              <b>{authorName}</b>
            </Link>
          )}
          {showAuthor && <span className="post__rate" title="Author rating">{`✦ ${post.author?.rating ?? 0}`}</span>}
          {hidden && (
            <span className="status status--inactive" title="Only the author and admins can see this post">
              <Pixel name="eyeOff" size={9} />
              hidden
            </span>
          )}
          {!hidden && !showAuthor && <span className="status">active</span>}
          <time className="mono" dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString()}>
            {formatDateTime(post.createdAt)}
          </time>
          {actions}
        </div>

        <h2 className="post__title">
          <Link to={`/posts/${post.id}`}>{post.title}</Link>
        </h2>
        {!compact && <p className="post__text">{excerpt(post.content)}</p>}

        <div className="post__foot">
          {post.categories.map((category) => (onCategoryClick ? (
            <button key={category.id} type="button" className="tag" title={category.description} onClick={() => onCategoryClick(category.id)}>
              {category.title}
            </button>
          ) : (
            <Link key={category.id} to={`/?categories=${category.id}`} className="tag" title={category.description}>
              {category.title}
            </Link>
          )))}
          <span className="post__stats">
            <span title="Likes minus dislikes">
              <Pixel name="heart" color={post.netLikes < 0 ? '#958c90' : '#c98a9c'} size={10} />
              {post.netLikes}
            </span>
            <Link to={`/posts/${post.id}#comments`} title={plural(post.commentsCount, 'comment')}>
              <Pixel name="bubble" color="#5b5357" size={10} />
              {post.commentsCount}
            </Link>
          </span>
        </div>
      </div>
    </article>
  );
}

export default PostCard;
