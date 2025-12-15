const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs').promises;
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/image-classifier.proto');
const SERVER_ADDRESS = 'localhost:50051';
const TEST_IMAGES_DIR = path.join(__dirname, '../test-images');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const classifierProto = grpc.loadPackageDefinition(packageDefinition).classifier;
const client = new classifierProto.ImageClassifier(SERVER_ADDRESS, grpc.credentials.createInsecure());

async function getTestImages() {
    try {
        const files = await fs.readdir(TEST_IMAGES_DIR);
        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|bmp)$/i.test(file));
        if (imageFiles.length === 0) throw new Error("No images found in test-images/");
        return imageFiles.map(file => path.join(TEST_IMAGES_DIR, file));
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

async function uploadSingleImageGrpc() {
    console.log('\n--- gRPC Single Image Upload ---');
    try {
        const images = await getTestImages();
        const imageBuffer = await fs.readFile(images[0]);
        const payloadSize = imageBuffer.length;

        const startTime = process.hrtime.bigint();
        
        const result = await new Promise((resolve, reject) => {
            client.UploadImage({ imageData: imageBuffer }, (error, response) => {
                if (error) return reject(error);
                resolve(response);
            });
        });

        const endTime = process.hrtime.bigint();
        const responseTimeMs = Number(endTime - startTime) / 1000000;
        
        console.log(`Success: Label: ${result.label}, Confidence: ${result.confidence}`);
        console.log(`Response Time: ${responseTimeMs.toFixed(3)} ms`);
        console.log(`Payload Size: ${payloadSize} bytes`);
        console.log(`Network Calls: 1`);

    } catch (error) {
        console.error('Error:', error);
    }
}

async function uploadMultipleImagesGrpc(count = 5) {
    console.log(`\n--- gRPC Multiple Image Upload (${count} Requests) ---`);
    try {
        const images = await getTestImages();
        const subset = images.slice(0, count);
        while(subset.length < count && images.length > 0) subset.push(images[0]);

        const imageBuffer = await fs.readFile(subset[0]); 
        const payloadSize = imageBuffer.length;
        
        const requests = [];

        for (let i = 0; i < count; i++) {
            requests.push(new Promise((resolve, reject) => {
                client.UploadImage({ imageData: imageBuffer }, (error, response) => {
                    if (error) return reject(error);
                    resolve(response);
                });
            }));
        }

        const startTime = process.hrtime.bigint();
        const results = await Promise.all(requests); 
        const endTime = process.hrtime.bigint();
        const totalTimeMs = Number(endTime - startTime) / 1000000;

        console.log(`Success for ${count} calls:`);
        console.log(`Total Time: ${totalTimeMs.toFixed(3)} ms`);
        console.log(`Payload Size Per Call: ${payloadSize} bytes`);
        console.log(`Network Calls: ${count}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

async function run() {
    await uploadSingleImageGrpc();
    await uploadMultipleImagesGrpc(5);
}

run();