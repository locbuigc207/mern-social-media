const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const path = require('path');
const { optimizeImage } = require('../utils/imageProcessor');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const {
      folder = 'campus-connect',
      resourceType = 'auto',
      transformation = null
    } = options;

    let uploadPath = filePath;
    if (resourceType === 'image' || path.extname(filePath).match(/\.(jpg|jpeg|png|gif)$/i)) {
      const optimized = await optimizeImage(filePath, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 85
      });
      uploadPath = optimized.optimizedPath;
    }

    const uploadOptions = {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true
    };

    if (transformation) {
      uploadOptions.transformation = transformation;
    }

    const result = await cloudinary.uploader.upload(uploadPath, uploadOptions);

    await fs.unlink(filePath).catch(() => {});
    if (uploadPath !== filePath) {
      await fs.unlink(uploadPath).catch(() => {});
    }

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      type: result.resource_type
    };
  } catch (error) {
    await fs.unlink(filePath).catch(() => {});
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

const uploadMultipleToCloudinary = async (filePaths, options = {}) => {
  const results = [];
  const errors = [];

  for (const filePath of filePaths) {
    try {
      const result = await uploadToCloudinary(filePath, options);
      results.push(result);
    } catch (error) {
      errors.push({
        file: path.basename(filePath),
        error: error.message
      });
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
    totalUploaded: results.length,
    totalFailed: errors.length
  };
};

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    return {
      success: result.result === 'ok',
      publicId,
      result: result.result
    };
  } catch (error) {
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};

const deleteMultipleFromCloudinary = async (publicIds, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType
    });

    return {
      success: true,
      deleted: result.deleted,
      deletedCount: Object.keys(result.deleted).length
    };
  } catch (error) {
    throw new Error(`Cloudinary batch delete failed: ${error.message}`);
  }
};

const getCloudinaryFileInfo = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });

    return {
      success: true,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      url: result.secure_url,
      createdAt: result.created_at
    };
  } catch (error) {
    throw new Error(`Failed to get file info: ${error.message}`);
  }
};

const generateTransformationUrl = (publicId, transformations) => {
  return cloudinary.url(publicId, transformations);
};

const transformations = {
  thumbnail: { width: 150, height: 150, crop: 'thumb', gravity: 'face' },
  profile: { width: 400, height: 400, crop: 'fill', gravity: 'face' },
  post: { width: 800, quality: 'auto', fetch_format: 'auto' },
  story: { width: 1080, height: 1920, crop: 'fill' }
};

module.exports = {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  getCloudinaryFileInfo,
  generateTransformationUrl,
  transformations
};