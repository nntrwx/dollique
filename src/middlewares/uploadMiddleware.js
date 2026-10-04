const multer = require('multer');
const path = require('path');
const fs = require('fs');

const avatarsDir = path.join(__dirname, '../../uploads/avatars');
const postsDir = path.join(__dirname, '../../uploads/posts');
const avatarPartsDir = path.join(__dirname, '../../uploads/avatar-parts');

for (const dir of [avatarsDir, postsDir, avatarPartsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// The extension comes from the checked MIME type, never from the client's file name,
// so a file like "evil.html" can't be uploaded and served as a web page
const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${uniqueSuffix}${EXTENSIONS[file.mimetype]}`);
  },
});

const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, postsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `post-${uniqueSuffix}${EXTENSIONS[file.mimetype]}`);
  },
});

const avatarPartStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarPartsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `part-${uniqueSuffix}${EXTENSIONS[file.mimetype]}`);
  },
});

const imageFilter = (req, file, cb) => {
  if (EXTENSIONS[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WEBP, GIF) are allowed!'), false);
  }
};

// Doll layers are stacked on top of each other, so they need transparency: no JPEG
const transparentImageFilter = (req, file, cb) => {
  if (EXTENSIONS[file.mimetype] && file.mimetype !== 'image/jpeg') {
    cb(null, true);
  } else {
    cb(new Error('Avatar parts must be transparent image files (PNG, WEBP, GIF)!'), false);
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadPostImage = multer({
  storage: postStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadAvatarPart = multer({
  storage: avatarPartStorage,
  fileFilter: transparentImageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = {
  uploadAvatar,
  uploadPostImage,
  uploadAvatarPart,
};