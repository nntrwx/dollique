const multer = require('multer');
const path = require('path');
const fs = require('fs');

const avatarsDir = path.join(__dirname, '../../uploads/avatars');
const postsDir = path.join(__dirname, '../../uploads/posts');
const dollPartsDir = path.join(__dirname, '../../uploads/doll_parts');

for (const dir of [avatarsDir, postsDir, dollPartsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

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

const dollPartStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dollPartsDir);
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

const transparentImageFilter = (req, file, cb) => {
  if (EXTENSIONS[file.mimetype] && file.mimetype !== 'image/jpeg') {
    cb(null, true);
  } else {
    cb(new Error('Doll parts must be transparent image files (PNG, WEBP, GIF)!'), false);
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

const uploadDollPart = multer({
  storage: dollPartStorage,
  fileFilter: transparentImageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = {
  uploadAvatar,
  uploadPostImage,
  uploadDollPart,
};