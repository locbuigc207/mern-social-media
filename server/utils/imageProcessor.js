const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const optimizeImage = async (inputPath, options = {}) => {
  try {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 80,
      format = 'jpeg',
      outputPath = null
    } = options;

    const finalOutputPath = outputPath || inputPath.replace(
      path.extname(inputPath),
      `-optimized${path.extname(inputPath)}`
    );

    let pipeline = sharp(inputPath);

    const metadata = await pipeline.metadata();

    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    if (format === 'jpeg' || format === 'jpg') {
      pipeline = pipeline.jpeg({ quality, progressive: true });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality, compressionLevel: 9 });
    } else if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    }

    await pipeline.toFile(finalOutputPath);

    const originalStats = await fs.stat(inputPath);
    const optimizedStats = await fs.stat(finalOutputPath);

    return {
      success: true,
      originalPath: inputPath,
      optimizedPath: finalOutputPath,
      originalSize: originalStats.size,
      optimizedSize: optimizedStats.size,
      savedBytes: originalStats.size - optimizedStats.size,
      savedPercentage: ((originalStats.size - optimizedStats.size) / originalStats.size * 100).toFixed(2)
    };
  } catch (error) {
    throw new Error(`Image optimization failed: ${error.message}`);
  }
};

const createThumbnails = async (inputPath, sizes = []) => {
  const defaultSizes = [
    { name: 'small', width: 150, height: 150 },
    { name: 'medium', width: 300, height: 300 },
    { name: 'large', width: 600, height: 600 }
  ];

  const thumbnailSizes = sizes.length > 0 ? sizes : defaultSizes;
  const thumbnails = [];

  for (const size of thumbnailSizes) {
    const outputPath = inputPath.replace(
      path.extname(inputPath),
      `-${size.name}${path.extname(inputPath)}`
    );

    await sharp(inputPath)
      .resize(size.width, size.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    thumbnails.push({
      name: size.name,
      path: outputPath,
      width: size.width,
      height: size.height
    });
  }

  return thumbnails;
};

const extractVideoThumbnail = async (videoPath) => {
  const ffmpeg = require('fluent-ffmpeg');
  const thumbnailPath = videoPath.replace(
    path.extname(videoPath),
    '-thumb.jpg'
  );

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: '320x240'
      })
      .on('end', () => resolve(thumbnailPath))
      .on('error', reject);
  });
};

const getImageInfo = async (imagePath) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    const stats = await fs.stat(imagePath);

    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      size: stats.size,
      sizeInMB: (stats.size / (1024 * 1024)).toFixed(2)
    };
  } catch (error) {
    throw new Error(`Failed to get image info: ${error.message}`);
  }
};


const batchOptimize = async (imagePaths, options = {}) => {
  const results = [];

  for (const imagePath of imagePaths) {
    try {
      const result = await optimizeImage(imagePath, options);
      results.push({ ...result, status: 'success' });
    } catch (error) {
      results.push({
        status: 'failed',
        path: imagePath,
        error: error.message
      });
    }
  }

  return results;
};

module.exports = {
  optimizeImage,
  createThumbnails,
  extractVideoThumbnail,
  getImageInfo,
  batchOptimize
};