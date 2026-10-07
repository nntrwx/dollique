const express = require('express');
const DollPartController = require('../controllers/dollPartController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuth = require('../middlewares/optionalAuthMiddleware');
const requireAdmin = require('../middlewares/roleMiddleware');
const { uploadDollPart } = require('../middlewares/uploadMiddleware');

const router = express.Router();

const partImage = uploadDollPart.single('image');

router.get('/', optionalAuth, DollPartController.getAllParts);
router.get('/:part_id', DollPartController.getPartById);

router.post('/', authMiddleware, requireAdmin, partImage, DollPartController.createPart);
router.patch('/:part_id', authMiddleware, requireAdmin, partImage, DollPartController.updatePart);
router.delete('/:part_id', authMiddleware, requireAdmin, DollPartController.deletePart);

module.exports = router;
