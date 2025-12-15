const { createTRPCClient, httpBatchLink } = require('@trpc/client');
const fs = require('fs').promises;
const path = require('path');

const TRPC_ENDPOINT = 'http://localhost:3001/trpc';
const TEST_IMAGES_DIR = path.join(__dirname, '../test-images');

const trpcClient = createTRPCClient({
  links: [
    httpBatchLink({
      url: TRPC_ENDPOINT,
    }),
  ],
});

function bufferToBase64(buffer) {
    return buffer.toString('base64');
}

async function getTestImages() {
    try {
        const files = await fs.readdir(TEST_IMAGES_DIR);
        // Filter for image files only
        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|bmp)$/i.test(file));
        if (imageFiles.length === 0) throw new Error("No images found in test-images/");
        return imageFiles.map(file => path.join(TEST_IMAGES_DIR, file));
    } catch (err) {
        console.error("Error reading directory:", err.message);
        process.exit(1);
    }
}

async function uploadSingleImage() {
    console.log('--- tRPC Single Image Upload ---');
    try {
        const images = await getTestImages();
        const firstImage = images[0];
        
        const imageBuffer = await fs.readFile(firstImage);
        const base64Image = bufferToBase64(imageBuffer);
        const filename = path.basename(firstImage);
        
        const startTime = process.hrtime.bigint();
        
        const result = await trpcClient.image.uploadImage.mutate({
            imageData: base64Image,
            filename: filename
        });

        const endTime = process.hrtime.bigint();
        const responseTimeMs = Number(endTime - startTime) / 1000000;
        
        const requestBody = JSON.stringify({
            '0': { json: { imageData: base64Image, filename: filename } }
        });
        const wirePayloadSize = Buffer.byteLength(requestBody, 'utf8');
        
        console.log(`Classification Success for ${filename}:`);
        console.log(`Label: ${result.label}, Confidence: ${result.confidence}`);
        console.log(`Response Time: ${responseTimeMs.toFixed(3)} ms`);
        console.log(`Wire Payload Size: ${wirePayloadSize} bytes`);
        console.log(`Network Calls: 1`);

    } catch (error) {
        console.error('tRPC Single Upload Error:', error.message);
    }
}

async function uploadBatchedImages() {
    console.log(`\n--- tRPC Batched Image Upload (Batch of 5) ---`);
    try {
        const imagePaths = await getTestImages();
        // Take up to 5 images, reuse if fewer than 5
        const subset = imagePaths.slice(0, 5);
        while(subset.length < 5 && imagePaths.length > 0) {
            subset.push(imagePaths[0]);
        }

        const promises = [];
        let totalBase64Length = 0;

        for (const imgPath of subset) {
            const imageBuffer = await fs.readFile(imgPath);
            const base64Image = bufferToBase64(imageBuffer);
            const filename = path.basename(imgPath);
            
            totalBase64Length += base64Image.length;

            promises.push(
                trpcClient.image.uploadImage.mutate({
                    imageData: base64Image,
                    filename: filename
                })
            );
        }

        const startTime = process.hrtime.bigint();
        const results = await Promise.all(promises); 
        const endTime = process.hrtime.bigint();
        const responseTimeMs = Number(endTime - startTime) / 1000000;

        const baseBody = JSON.stringify(promises.map((_, i) => ({
            json: { imageData: 'BASE64_PLACEHOLDER', filename: `batch_img_${i}.jpg` }
        })));
        const approxPayloadSize = Buffer.byteLength(baseBody.replace(/"BASE64_PLACEHOLDER"/g, totalBase64Length), 'utf8');

        console.log(`Classification Success for ${subset.length} batched images:`);
        results.forEach((result, index) => {
            console.log(`Image ${index + 1}: Label: ${result.label}, Confidence: ${result.confidence}`);
        });
        console.log(`Total Time for all: ${responseTimeMs.toFixed(3)} ms`);
        console.log(`Approximate Payload Size: ${approxPayloadSize} bytes`);
        console.log(`Network Calls: 1`);

    } catch (error) {
        console.error('tRPC Batched Upload Error:', error.message);
    }
}

async function runTrpcTest() {
    await uploadSingleImage();
    await uploadBatchedImages();
}

runTrpcTest();