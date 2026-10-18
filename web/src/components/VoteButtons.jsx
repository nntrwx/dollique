import Pixel from './Pixel';

// Like / dislike with pixel hearts. Big: one pill with the score in the middle (posts).
// Small: two glass pills, the score sits on the heart (comments).
// Without onVote (guests, hidden posts) the buttons are shown but disabled.
function VoteButtons({
  score, myVote = null, onVote = null, disabledReason = '', small = false,
}) {
  const disabled = !onVote;
  const liked = myVote === 'like';
  const disliked = myVote === 'dislike';

  if (small) {
    return (
      <span className="votes-sm" title={disabled ? disabledReason : undefined}>
        <button type="button" className={`pill${liked ? ' on' : ''}`} aria-pressed={liked} aria-label="Like" disabled={disabled} onClick={() => onVote('like')}>
          <Pixel name="heart" color={liked ? '#c98a9c' : '#5b5357'} size={10} />
          {score}
        </button>
        <button type="button" className={`pill${disliked ? ' on' : ''}`} aria-pressed={disliked} aria-label="Dislike" disabled={disabled} onClick={() => onVote('dislike')}>
          <Pixel name="broken" color={disliked ? '#c98a9c' : '#958c90'} size={10} />
        </button>
      </span>
    );
  }

  return (
    <span className="vote" title={disabled ? disabledReason : undefined}>
      <button type="button" className={liked ? 'on' : undefined} aria-pressed={liked} aria-label="Like" disabled={disabled} onClick={() => onVote('like')}>
        <Pixel name="heart" color="#211c1f" size={14} />
      </button>
      <b className={score < 0 ? 'neg' : undefined}>{score}</b>
      <button type="button" className={disliked ? 'on' : undefined} aria-pressed={disliked} aria-label="Dislike" disabled={disabled} onClick={() => onVote('dislike')}>
        <Pixel name="broken" color={disliked ? '#211c1f' : '#958c90'} size={14} />
      </button>
    </span>
  );
}

export default VoteButtons;
