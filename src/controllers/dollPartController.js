const fs = require('fs');
const path = require('path');
const DollPartModel = require('../models/DollPartModel');
const DollService = require('../services/dollService');

const NAME_MAX_LENGTH = 100;
const PARTS_URL = '/uploads/doll_parts/';
const uploadsRoot = path.join(__dirname, '../../uploads');

// Only files uploaded through the API are removed; the seed layers that ship with the repo stay
function removeUploadedFile(url) {
  if (!url || !url.startsWith(`${PARTS_URL}part-`)) return;
  fs.unlink(path.join(uploadsRoot, url.replace('/uploads/', '')), () => {});
}

function uploadedUrl(req) {
  return req.file ? `${PARTS_URL}${req.file.filename}` : null;
}

// Drop the file of a rejected request so it doesn't pile up on disk
function discardUploads(req) {
  removeUploadedFile(uploadedUrl(req));
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
    if (!DollService.CATEGORIES.includes(body.category)) {
      return { error: `Category must be one of: ${DollService.CATEGORIES.join(', ')}.` };
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

class DollPartController {
  // GET /api/doll-parts?category=outfit - Catalog for the doll editor
  // Everyone sees active parts; admins see all of them with usage counts (?active=true|false filters)
  static async getAllParts(req, res) {
    try {
      const { category, active } = req.query;
      if (category && !DollService.CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `Category must be one of: ${DollService.CATEGORIES.join(', ')}.` });
      }

      const isAdmin = req.user && req.user.role === 'admin';
      let parts = await DollPartModel.findAll({ category, includeInactive: isAdmin });

      if (isAdmin) {
        const activeFilter = parseBoolean(active);
        if (activeFilter !== undefined && activeFilter !== null) {
          parts = parts.filter(p => Boolean(p.is_active) === activeFilter);
        }
        const usage = await DollService.usageCounts();
        parts = parts.map(p => ({ ...p, used_by: usage.get(p.id) || 0 }));
      }

      return res.status(200).json(parts);
    } catch (error) {
      console.error('Get doll parts error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching doll parts.' });
    }
  }

  // GET /api/doll-parts/:part_id
  static async getPartById(req, res) {
    try {
      const part = await DollPartModel.findById(req.params.part_id);
      if (!part) return res.status(404).json({ error: 'Doll part not found.' });
      return res.status(200).json(part);
    } catch (error) {
      console.error('Get doll part error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching the doll part.' });
    }
  }

  // POST /api/doll-parts - multipart: image (required), name, category, layer, is_active (admin)
  static async createPart(req, res) {
    try {
      const imageUrl = uploadedUrl(req);
      if (!imageUrl) {
        discardUploads(req);
        return res.status(400).json({ error: 'Upload the part picture in the "image" field (transparent PNG).' });
      }

      const { data, error } = readFields(req.body || {}, false);
      if (error) {
        discardUploads(req);
        return res.status(400).json({ error });
      }

      const part = await DollPartModel.create({
        ...data,
        layer: data.layer ?? DollService.DEFAULT_LAYERS[data.category],
        imageUrl,
      });

      return res.status(201).json({ message: 'Doll part created successfully.', part });
    } catch (error) {
      discardUploads(req);
      console.error('Create doll part error:', error);
      return res.status(500).json({ error: 'Internal server error while creating the doll part.' });
    }
  }

  // PATCH /api/doll-parts/:part_id - any of the create fields, a new image replaces the old one (admin)
  static async updatePart(req, res) {
    try {
      const part = await DollPartModel.findById(req.params.part_id);
      if (!part) {
        discardUploads(req);
        return res.status(404).json({ error: 'Doll part not found.' });
      }

      const { data, error } = readFields(req.body || {}, true);
      if (error) {
        discardUploads(req);
        return res.status(400).json({ error });
      }

      // Moving a worn part to another category would break the dolls that wear it
      if (data.category && data.category !== part.category) {
        const usedBy = (await DollService.usageCounts()).get(part.id) || 0;
        if (usedBy > 0) {
          discardUploads(req);
          return res.status(409).json({
            error: `Part #${part.id} is worn by ${usedBy} user(s), so its category can't change. Create a new part instead.`,
          });
        }
      }

      const newImage = uploadedUrl(req);
      if (newImage) data.imageUrl = newImage;

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'Nothing to update.' });
      }

      const updated = await DollPartModel.update(part.id, data);
      if (newImage) removeUploadedFile(part.image_url);

      return res.status(200).json({ message: 'Doll part updated successfully.', part: updated });
    } catch (error) {
      discardUploads(req);
      console.error('Update doll part error:', error);
      return res.status(500).json({ error: 'Internal server error while updating the doll part.' });
    }
  }

  // DELETE /api/doll-parts/:part_id (admin). Worn parts can only be deactivated.
  static async deletePart(req, res) {
    try {
      const part = await DollPartModel.findById(req.params.part_id);
      if (!part) return res.status(404).json({ error: 'Doll part not found.' });

      const usedBy = (await DollService.usageCounts()).get(part.id) || 0;
      if (usedBy > 0) {
        return res.status(409).json({
          error: `Part #${part.id} is worn by ${usedBy} user(s). Deactivate it instead: they keep it, nobody new can pick it.`,
        });
      }

      await DollPartModel.delete(part.id);
      removeUploadedFile(part.image_url);

      return res.status(200).json({ message: 'Doll part deleted successfully.' });
    } catch (error) {
      console.error('Delete doll part error:', error);
      return res.status(500).json({ error: 'Internal server error while deleting the doll part.' });
    }
  }
}

module.exports = DollPartController;
