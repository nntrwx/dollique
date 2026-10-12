export const DEFAULT_AVATAR = '/uploads/avatars/default.png';

function Avatar({ src = null, alt, size = 40 }) {
  return (
    <img
      className="avatar"
      src={src || DEFAULT_AVATAR}
      alt={alt}
      width={size}
      height={size}
      onError={(event) => {
        // A broken file on the server falls back to the default picture.
        if (!event.currentTarget.src.endsWith(DEFAULT_AVATAR)) {
          event.currentTarget.src = DEFAULT_AVATAR;
        }
      }}
    />
  );
}

export default Avatar;
