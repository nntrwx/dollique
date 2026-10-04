const fs = require('fs');
const path = require('path');
const AvatarPartModel = require('../models/AvatarPartModel');
const AvatarService = require('../services/avatarService');

const NAME_MAX_LENGTH = 100;
const PARTS_URL = '/uploads/avatar-parts/';
const uploadsRoot = path.join(__dirname, '../../uploads');

// Only files uploaded through the API are removed; the seed layers that ship with the repo stay
function removeUploadedFile(url) {
  if (!url || !url.startsWith(`${PARTS_URL}part-`)) return;
  fs.unlink(path.join(uploadsRoot, url.replace('/uploads/', '')), () => {});
}

function uploadedUrl(req, field) {
  const file = req.files && req.files[field] && req.files[field][0];
  return file ? `${PARTS_URL}${file.filename}` : null;
}

// Drop the files of a rejected request so they don't pile up on disk
function discardUploads(req) {
  removeUploadedFile(uploadedUrl(req, 'image'));
  removeUploadedFile(uploadedUrl(req, 'back_image'));
}

function parseBoolean(value) {
  if (value === undefined) return undefined;
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  return null;
}

// Validates name/category/layer/is_active; `partial` allows missing fields (PATCH)
function readFields(body, partial) {
  const data = {};

  if (body.name !== undefined || !partial) {
    const name = String(body.name ?? '').trim();
    if (!name) return { error: 'Part name is required.' };
    if (name.length > NAME_MAX_LENGTH) return { error: `Part name cannot exceed ${NAME_MAX_LENGTH} characters.` };
    data.name = name;
  }

  if (body.category !== undefined || !partial) {
    if (!AvatarService.CATEGORIES.includes(body.category)) {
      return { error: `Category must be one of: ${AvatarService.CATEGORIES.join(', ')}.` };
    }
    data.category = body.category;
  }

  if (body.layer !== undefined && body.layer !== '') {
    const layer = Number(body.layer);
    if (!Number.isInteger(layer) || layer < 0 || layer > 1000) {
      return { error: 'Layer must be a whole number from 0 to 1000.' };
    }
    data.layer = layer;
  }

  const isActive = parseBoolean(body.is_active);
  if (isActive === null) return { error: 'is_active must be true or false.' };
  if (isActive !== undefined) data.isActive = isActive;

  return { data };
}

class AvatarPartController {
  // GET /api/avatar-parts?category=outfit - Catalog for the doll editor
  // Everyone sees active parts; admins see all of them with usage counts (?active=true|false filters)
  static async getAllParts(req, res) {
    try {
      const { category, active } = req.query;
      if (category && !AvatarService.CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `Category must be one of: ${AvatarService.CATEGORIES.join(', ')}.` });
      }

      const isAdmin = req.user && req.user.role === 'admin';
      let parts = await AvatarPartModel.findAll({ category, includeInactive: isAdmin });

      if (isAdmin) {
        const activeFilter = parseBoolean(active);
        if (activeFilter !== undefined && activeFilter !== null) {
          parts = parts.filter(p => Boolean(p.is_active) === activeFilter);
        }
        const usage = await AvatarService.usageCounts();
        parts = parts.map(p => ({ ...p, used_by: usage.get(p.id) || 0 }));
      }

      return res.status(200).json(parts);
    } catch (error) {
      console.error('Get avatar parts error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching avatar parts.' });
    }
  }

  // GET /api/avatar-parts/:part_id
  static async getPartById(req, res) {
    try {
      const part = await AvatarPartModel.findById(req.params.part_id);
      if (!part) return res.status(404).json({ error: 'Avatar part not found.' });
      return res.status(200).json(part);
    } catch (error) {
      console.error('Get avatar part error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching the avatar part.' });
    }
  }

  // POST /api/avatar-parts - multipart: image (required), back_image, name, category, layer, is_active (admin)
  static async createPart(req, res) {
    try {
      const imageUrl = uploadedUrl(req, 'image');
      if (!imageUrl) {
        discardUploads(req);
        return res.status(400).json({ error: 'Upload the part picture in the "image" field (transparent PNG).' });
      }

      const { data, error } = readFields(req.body || {}, false);
      if (error) {
        discardUploads(req);
        return res.status(400).json({ error });
      }

      const part = await AvatarPartModel.create({
        ...data,
        layer: data.layer ?? AvatarService.DEFAULT_LAYERS[data.category],
        imageUrl,
        backImageUrl: uploadedUrl(req, 'back_image'),
      });

      return res.status(201).json({ message: 'Avatar part created successfully.', part });
    } catch (error) {
      discardUploads(req);
      console.error('Create avatar part error:', error);
      return res.status(500).json({ error: 'Internal server error while creating the avatar part.' });
    }
  }

  // PATCH /api/avatar-parts/:part_id - any of the create fields; remove_back_image=true drops the back picture (admin)
  static async updatePart(req, res) {
    try {
      const part = await AvatarPartModel.findById(req.params.part_id);
      if (!part) {
        discardUploads(req);
        return res.status(404).json({ error: 'Avatar part not found.' });
      }

      const { data, error } = readFields(req.body || {}, true);
      if (error) {
        discardUploads(req);
        return res.status(400).json({ error });
      }

      // Moving a worn part to another category would break the dolls that wear it
      if (data.category && data.category !== part.category) {
        const usedBy = (await AvatarService.usageCounts()).get(part.id) || 0;
        if (usedBy > 0) {
          discardUploads(req);
          return res.status(409).json({
            error: `Part #${part.id} is worn by ${usedBy} user(s), so its category can't change. Create a new part instead.`,
          });
        }
      }

      const newImage = uploadedUrl(req, 'image');
      const newBackImage = uploadedUrl(req, 'back_image');
      if (newImage) data.imageUrl = newImage;
      if (newBackImage) data.backImageUrl = newBackImage;
      else if (parseBoolean((req.body || {}).remove_back_image)) data.backImageUrl = null;

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'Nothing to update.' });
      }

      const updated = await AvatarPartModel.update(part.id, data);
      if (newImage) removeUploadedFile(part.image_url);
      if (data.backImageUrl !== undefined) removeUploadedFile(part.back_image_url);

      return res.status(200).json({ message: 'Avatar part updated successfully.', part: updated });
    } catch (error) {
      discardUploads(req);
      console.error('Update avatar part error:', error);
      return res.status(500).json({ error: 'Internal server error while updating the avatar part.' });
    }
  }

  // DELETE /api/avatar-parts/:part_id (admin). Worn parts can only be deactivated.
  static async deletePart(req, res) {
    try {
      const part = await AvatarPartModel.findById(req.params.part_id);
      if (!part) return res.status(404).json({ error: 'Avatar part not found.' });

      const usedBy = (await AvatarService.usageCounts()).get(part.id) || 0;
      if (usedBy > 0) {
        return res.status(409).json({
          error: `Part #${part.id} is worn by ${usedBy} user(s). Deactivate it instead: they keep it, nobody new can pick it.`,
        });
      }

      await AvatarPartModel.delete(part.id);
      removeUploadedFile(part.image_url);
      removeUploadedFile(part.back_image_url);

      return res.status(200).json({ message: 'Avatar part deleted successfully.' });
    } catch (error) {
      console.error('Delete avatar part error:', error);
      return res.status(500).json({ error: 'Internal server error while deleting the avatar part.' });
    }
  }
}

module.exports = AvatarPartController;
