const crypto = require('crypto');


const CATEGORIES = [
  'cat', 'dog', 'bird', 'car', 'tree', 
  'person', 'building', 'food', 'flower', 'digit'
];

/**
 * Classify an image
 * @param {Buffer} imageBuffer
 * @returns {Promise<{label: string, confidence: number}>}
 */
async function classifyImage(imageBuffer) {
  const processingTime = Math.random() * 100 + 50;
  await new Promise(resolve => setTimeout(resolve, processingTime));

  
  const hash = crypto.createHash('md5').update(imageBuffer).digest('hex');
  const hashValue = parseInt(hash.substring(0, 8), 16);
  
  const labelIndex = hashValue % CATEGORIES.length;
  const label = CATEGORIES[labelIndex];

  const confidence = 0.75 + (hashValue % 10000) / 10000 * 0.24;
  
  return {
    label,
    confidence: parseFloat(confidence.toFixed(4))
  };
}

/**
 * Classify multiple images
 * @param {Buffer[]} imageBuffers
 * @returns {Promise<Array<{label: string, confidence: number}>>}
 */
async function classifyImages(imageBuffers) {
  const results = [];
  for (const buffer of imageBuffers) {
    const result = await classifyImage(buffer);
    results.push(result);
  }
  return results;
}


function getModelInfo() {
  return {
    name: 'ImageClassifier-v1',
    version: '1.0.0',
    categories: CATEGORIES,
    description: 'AI classification model for testing'
  };
}

module.exports = {
  classifyImage,
  classifyImages,
  getModelInfo
};