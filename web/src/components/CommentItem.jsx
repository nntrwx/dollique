import { useState } from 'react';
import { Link } from 'react-router-dom';

import { formatShortDateTime } from '../utils/format';
import Avatar from './Avatar';
import CommentForm from './CommentForm';
import ConfirmButton from './ConfirmButton';
import Pixel from './Pixel';
import VoteButtons from './VoteButtons';

// Deeper replies stop shifting right, so long threads still fit on a phone.
const MAX_INDENT = 4;

// One comment with its replies (the component renders itself for every reply).
// Replies hang on thin grey branches. thread holds what every comment needs:
// the user, permissions and the actions.
function CommentItem({ comment, depth = 0, thread }) {
  const [mode, setMode] = useState(null); // null, 'reply' or 'edit'
  const [collapsed, setCollapsed] = useState(false);

  const { user, postAuthorId, canWrite } = thread;
  const isAuthor = user?.id === comment.authorId;
  const isAdmin = user?.role === 'admin';
  const hidden = comment.status === 'inactive';
  const edited = new Date(comment.updatedAt) - new Date(comment.createdAt) > 1000;
  const replies = thread.sort(comment.replies || []);
  const showReplies = replies.length > 0 && !collapsed;
  const authorName = comment.author?.login || 'deleted user';

  let voteHint = 'Sign in to vote';
  if (user && hidden) voteHint = 'Hidden comments cannot be voted on';
  const canVote = user && !hidden;

  return (
    <div className={`cm${isAuthor ? ' mine' : ''}${hidden ? ' cm--hidden' : ''}`} id={`comment-${comment.id}`}>
      {depth > 0 && (
        <>
          <span className="elbow" />
          <span className="rail" />
        </>
      )}
      <div className="lcol">
        <Link to={`/users/${comment.authorId}`} aria-label={authorName}>
          <Avatar src={comment.author?.profilePicture} alt={authorName} size={38} userId={comment.authorId} />
        </Link>
        {showReplies && <span className="stem" />}
      </div>

      <div className="ctext">
        <div className="who">
          <Link to={`/users/${comment.authorId}`}><b>{authorName}</b></Link>
          {comment.authorId === postAuthorId && <span className="badge badge--soft">author</span>}
          {isAuthor && <span className="badge">you</span>}
          {hidden && <span className="badge badge--hidden">hidden</span>}
          <span className="who__rate">{`✦ ${comment.author?.rating ?? 0}`}</span>
          <time className="mono" dateTime={comment.createdAt} title={new Date(comment.createdAt).toLocaleString()}>
            {formatShortDateTime(comment.createdAt)}
            {edited && ' · edited'}
          </time>
        </div>

        {mode === 'edit' ? (
          <CommentForm
            initialText={comment.content}
            submitLabel="Save"
            autoFocus
            onSubmit={async (text) => {
              await thread.onEdit(comment.id, text);
              setMode(null);
            }}
            onCancel={() => setMode(null)}
          />
        ) : (
          <p className="ctext__body">{comment.content}</p>
        )}

        <div className="cacts">
          <VoteButtons
            small
            score={comment.netLikes}
            myVote={thread.myVotes[comment.id] || null}
            onVote={canVote ? (type) => thread.onVote(comment, type) : null}
            disabledReason={voteHint}
          />
          {canWrite && !hidden && (
            <button type="button" className="link-button" onClick={() => setMode(mode === 'reply' ? null : 'reply')}>
              <Pixel name="reply" color="currentColor" size={9} />
              Reply
            </button>
          )}
          {replies.length > 0 && (
            <button type="button" className="link-button" onClick={() => setCollapsed(!collapsed)}>
              {collapsed
                ? `+ show ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`
                : `− hide ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
            </button>
          )}
          <span className="cacts__own">
            {isAuthor && canWrite && (
              <button type="button" className="link-button" onClick={() => setMode(mode === 'edit' ? null : 'edit')}>
                Edit
              </button>
            )}
            {isAdmin && !isAuthor && (
              <button type="button" className="link-button" onClick={() => thread.onToggleStatus(comment)}>
                {hidden ? 'Show' : 'Hide'}
              </button>
            )}
            {(isAuthor || isAdmin || user?.id === postAuthorId) && (
              <ConfirmButton
                className="link-button link-button--danger"
                question={replies.length ? 'Delete with all replies?' : 'Delete?'}
                confirmLabel="Delete"
                onConfirm={() => thread.onDelete(comment.id)}
              >
                Delete
              </ConfirmButton>
            )}
          </span>
        </div>

        {mode === 'reply' && (
          <div className="ctext__reply">
            <CommentForm
              submitLabel="Reply"
              placeholder={`Reply to ${authorName}…`}
              autoFocus
              onSubmit={async (text) => {
                await thread.onReply(comment.id, text);
                setMode(null);
                setCollapsed(false);
              }}
              onCancel={() => setMode(null)}
            />
          </div>
        )}
      </div>

      {showReplies && (
        <div className={`replies${depth + 1 >= MAX_INDENT ? ' replies--flat' : ''}`}>
          {replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} thread={thread} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CommentItem;
