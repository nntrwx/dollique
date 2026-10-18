import Pixel from './Pixel';

// Follow / unfollow a category (its posts go to the "For you" feed).
// compact: just the heart; short: "Follow" without the category name.
function FollowButton({
  on, title, onClick, compact = false, short = false,
}) {
  return (
    <button
      type="button"
      className={`follow${on ? ' on' : ''}${compact ? ' follow--compact' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Unfollow ${title}` : `Follow ${title}`}
      title={on ? 'Following: click to unfollow' : 'Follow: its posts will show in “For you”'}
      onClick={onClick}
    >
      <Pixel name="heart" size={compact ? 9 : 10} />
      {!compact && <span>{(on ? 'Following' : 'Follow') + (short ? '' : ` ${title}`)}</span>}
    </button>
  );
}

export default FollowButton;
