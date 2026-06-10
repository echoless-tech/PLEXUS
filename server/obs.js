const ObsClient = require('esdk-obs-nodejs');
const path = require('path');
const crypto = require('crypto');

let obsClient = null;

function getObsClient() {
  if (!obsClient) {
    obsClient = new ObsClient({
      access_key_id: process.env.OBS_AK,
      secret_access_key: process.env.OBS_SK,
      server: process.env.OBS_ENDPOINT, // e.g. obs.af-south-1.myhuaweicloud.com
    });
  }
  return obsClient;
}

const BUCKET = process.env.OBS_BUCKET || 'nodal-object-storage';

/**
 * Upload a file buffer to Huawei OBS
 * @param {Buffer} fileBuffer - The file content
 * @param {string} originalName - Original filename (for extension)
 * @param {string} folder - Folder prefix (e.g., 'products', 'storefront')
 * @returns {Promise<{key: string, url: string}>}
 */
async function uploadImage(fileBuffer, originalName, folder = 'images') {
  const obs = getObsClient();
  const ext = path.extname(originalName).toLowerCase();
  const uniqueName = `${folder}/${crypto.randomUUID()}${ext}`;

  const contentTypeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };

  return new Promise((resolve, reject) => {
    obs.putObject({
      Bucket: BUCKET,
      Key: uniqueName,
      Body: fileBuffer,
      ContentType: contentTypeMap[ext] || 'application/octet-stream',
    }, (err, result) => {
      if (err) {
        console.error('OBS upload error:', err);
        return reject(new Error('Failed to upload image to OBS'));
      }
      if (result.CommonMsg.Status >= 300) {
        console.error('OBS upload failed:', result.CommonMsg);
        return reject(new Error(`OBS upload failed: ${result.CommonMsg.Message}`));
      }

      const url = `https://${BUCKET}.${process.env.OBS_ENDPOINT}/${uniqueName}`;
      resolve({ key: uniqueName, url });
    });
  });
}

/**
 * Delete a file from Huawei OBS
 * @param {string} key - The object key to delete
 */
async function deleteImage(key) {
  const obs = getObsClient();

  return new Promise((resolve, reject) => {
    obs.deleteObject({
      Bucket: BUCKET,
      Key: key,
    }, (err, result) => {
      if (err) {
        console.error('OBS delete error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
}

module.exports = { uploadImage, deleteImage, getObsClient };
