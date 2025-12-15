const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { classifyImage, getModelInfo } = require('../ai-service');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

function logMetrics(endpoint, startTime, payloadSize) {
  const duration = Date.now() - startTime;
  console.log(`\n[REST API Metrics]`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Response Time: ${duration}ms`);
  console.log(`Payload Size: ${payloadSize} bytes`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  return { duration, payloadSize };
}

app.post('/uploadImage', upload.single('image'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log(`\nReceived image: ${req.file.originalname} (${req.file.size} bytes)`);

    const result = await classifyImage(req.file.buffer);
 
    const responsePayload = JSON.stringify(result);
    const payloadSize = Buffer.byteLength(responsePayload);

    const metrics = logMetrics('/uploadImage', startTime, payloadSize);

    res.set('X-Response-Time', `${metrics.duration}ms`);
    res.set('X-Payload-Size', `${metrics.payloadSize} bytes`);
    res.json(result);

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});


app.post('/uploadImages', upload.array('images', 10), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    console.log(`\nReceived ${req.files.length} images`);

 
    const results = [];
    for (const file of req.files) {
      const result = await classifyImage(file.buffer);
      results.push({
        filename: file.originalname,
        ...result
      });
    }
    
 
    const responsePayload = JSON.stringify({ results });
    const payloadSize = Buffer.byteLength(responsePayload);
 
    const metrics = logMetrics('/uploadImages', startTime, payloadSize);

    res.set('X-Response-Time', `${metrics.duration}ms`);
    res.set('X-Payload-Size', `${metrics.payloadSize} bytes`);
    res.json({ 
      count: results.length,
      results 
    });

  } catch (error) {
    console.error('Error processing images:', error);
    res.status(500).json({ error: 'Failed to process images' });
  }
});

app.get('/model-info', (req, res) => {
  const info = getModelInfo();
  res.json(info);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'REST API' });
});


app.listen(PORT, () => {
  console.log(`\n🚀 REST API Server running on http://localhost:${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  POST http://localhost:${PORT}/uploadImage`);
  console.log(`  POST http://localhost:${PORT}/uploadImages`);
  console.log(`  GET  http://localhost:${PORT}/model-info`);
  console.log(`  GET  http://localhost:${PORT}/health\n`);
});