const express = require('express');
const AvatarPartController = require('../controllers/avatarPartController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuth = require('../middlewares/optionalAuthMiddleware');
const requireAdmin = require('../middlewares/roleMiddleware');
const { uploadAvatarPart } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Front picture plus an optional back picture (long hair behind the body, wings)
const partImages = uploadAvatarPart.fields([
  { name: 'image', maxCount: 1 },
  { name: 'back_image', maxCount: 1 },
]);

// Catalog for the doll editor (admins also get retired parts and usage counts)
router.get('/', optionalAuth, AvatarPartController.getAllParts);
router.get('/:part_id', AvatarPartController.getPartById);

// Catalog management (admin only)
router.post('/', authMiddleware, requireAdmin, partImages, AvatarPartController.createPart);
router.patch('/:part_id', authMiddleware, requireAdmin, partImages, AvatarPartController.updatePart);
router.delete('/:part_id', authMiddleware, requireAdmin, AvatarPartController.deletePart);

module.exports = router;
