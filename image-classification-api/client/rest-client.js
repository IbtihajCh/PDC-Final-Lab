const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const REST_API_URL = 'http://localhost:3001';

function measureMetrics(response, startTime) {
  const duration = Date.now() - startTime;
  const payloadSize = JSON.stringify(response.data).length;
  
  return {
    duration,
    payloadSize,
    serverResponseTime: response.headers['x-response-time'],
    serverPayloadSize: response.headers['x-payload-size']
  };
}

async function testSingleImage(imagePath) {
  console.log('\n=== TEST 1: Single Image Upload ===');
  console.log(`Uploading: ${path.basename(imagePath)}`);
  
  const startTime = Date.now();
  
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    
    const response = await axios.post(`${REST_API_URL}/uploadImage`, formData, {
      headers: formData.getHeaders()
    });
    
    const metrics = measureMetrics(response, startTime);
    
    console.log('Result:', response.data);
    console.log('Metrics:', {
      clientMeasuredTime: `${metrics.duration}ms`,
      serverResponseTime: metrics.serverResponseTime,
      payloadSize: `${metrics.payloadSize} bytes`
    });
    
    return { result: response.data, metrics };
    
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function testMultipleImages(imagePaths) {
  console.log('\n=== TEST 2: Multiple Images Upload (Batch) ===');
  console.log(`Uploading ${imagePaths.length} images at once`);
  
  const startTime = Date.now();
  
  try {
    const formData = new FormData();
    
    imagePaths.forEach((imagePath) => {
      formData.append('images', fs.createReadStream(imagePath));
    });
    
    const response = await axios.post(`${REST_API_URL}/uploadImages`, formData, {
      headers: formData.getHeaders()
    });
    
    const metrics = measureMetrics(response, startTime);
    
    console.log(`Results: ${response.data.count} images classified`);
    response.data.results.forEach((result, idx) => {
      console.log(`  ${idx + 1}. ${result.filename}: ${result.label} (${result.confidence})`);
    });
    
    console.log('Metrics:', {
      clientMeasuredTime: `${metrics.duration}ms`,
      serverResponseTime: metrics.serverResponseTime,
      payloadSize: `${metrics.payloadSize} bytes`
    });
    
    return { result: response.data, metrics };
    
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function testSequentialImages(imagePaths) {
  console.log('\n=== TEST 3: Sequential Image Uploads ===');
  console.log(`Uploading ${imagePaths.length} images one by one`);
  
  const startTime = Date.now();
  const results = [];
  let totalPayloadSize = 0;
  
  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    console.log(`\nUploading ${i + 1}/${imagePaths.length}: ${path.basename(imagePath)}`);
    
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));
      
      const response = await axios.post(`${REST_API_URL}/uploadImage`, formData, {
        headers: formData.getHeaders()
      });
      
      results.push(response.data);
      totalPayloadSize += JSON.stringify(response.data).length;
      
      console.log(`Result: ${response.data.label} (${response.data.confidence})`);
      
    } catch (error) {
      console.error(`Error uploading ${imagePath}:`, error.message);
    }
  }
  
  const totalDuration = Date.now() - startTime;
  
  console.log('\nSequential Upload Summary:');
  console.log(`Total Time: ${totalDuration}ms`);
  console.log(`Average Time per Image: ${(totalDuration / imagePaths.length).toFixed(2)}ms`);
  console.log(`Total Payload Size: ${totalPayloadSize} bytes`);
  
  return { results, totalDuration, totalPayloadSize };
}


async function runTests() {
  console.log('REST API Client Tests Starting...\n');

  const testImagesDir = path.join(__dirname, '..', 'test-images');

  if (!fs.existsSync(testImagesDir)) {
    console.error(`Test images directory not found: ${testImagesDir}`);
    console.log('Please create a "test-images" folder and add some test images.');
    return;
  }
  
  const imageFiles = fs.readdirSync(testImagesDir)
    .filter(file => /\.(jpg|jpeg|png|gif|bmp)$/i.test(file))
    .map(file => path.join(testImagesDir, file));
  
  if (imageFiles.length === 0) {
    console.error('No image files found in test-images directory');
    return;
  }
  
  console.log(`Found ${imageFiles.length} test images\n`);
  
  try {
    if (imageFiles.length >= 1) {
      await testSingleImage(imageFiles[0]);
    }
 
    const batchImages = imageFiles.slice(0, Math.min(5, imageFiles.length));
    if (batchImages.length >= 2) {
      await testMultipleImages(batchImages);
    }
    
    if (batchImages.length >= 2) {
      await testSequentialImages(batchImages);
    }
    
    console.log('\nAll REST API tests completed!');
    
  } catch (error) {
    console.error('\nTest failed:', error.message);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { testSingleImage, testMultipleImages, testSequentialImages };