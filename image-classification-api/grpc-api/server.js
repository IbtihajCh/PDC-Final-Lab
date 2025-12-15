const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');
const { classifyImage } = require('../ai-service');

// 1. Resolve the path safely
const PROTO_PATH = path.resolve(__dirname, '..', 'proto', 'image-classifier.proto');
const SERVER_ADDRESS = '0.0.0.0:50051';

console.log(`[INFO] Loading Proto file from: ${PROTO_PATH}`);

// 2. Check if file exists before loading to give a better error
if (!fs.existsSync(PROTO_PATH)) {
    console.error(`[CRITICAL ERROR] The file does not exist at path: ${PROTO_PATH}`);
    console.error(`[HINT] Check if the file is named 'image-classifier.proto.txt' inside the proto folder.`);
    console.error(`[INFO] Files found in ../proto folder:`);
    try {
        console.log(fs.readdirSync(path.join(__dirname, '../proto')));
    } catch (e) {
        console.log("Could not list directory (folder might be missing).");
    }
    process.exit(1);
}

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const classifierProto = grpc.loadPackageDefinition(packageDefinition).classifier;

function uploadImage(call, callback) {
  const imageBuffer = call.request.imageData;

  if (!imageBuffer || imageBuffer.length === 0) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      details: 'No image data provided',
    });
  }

  classifyImage(imageBuffer)
    .then(result => {
      callback(null, result);
    })
    .catch(error => {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message,
      });
    });
}

function main() {
  const server = new grpc.Server();
  server.addService(classifierProto.ImageClassifier.service, {
    UploadImage: uploadImage,
  });

  server.bindAsync(
    SERVER_ADDRESS,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Server bind failed:', err);
        return;
      }
      server.start();
      console.log(`gRPC server listening on ${SERVER_ADDRESS}`);
    }
  );
}

main();