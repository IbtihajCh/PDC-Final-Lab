const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const { classifyImage } = require('../../ai-service'); 

const PROTO_PATH = path.join(__dirname, '../../proto/image-classifier.proto');
const SERVER_ADDRESS = '0.0.0.0:50052';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const classifierProto = grpc.loadPackageDefinition(packageDefinition).classifier;

function uploadImage(call, callback) {
  const imageBuffer = call.request.imageData;

  classifyImage(imageBuffer)
    .then(result => callback(null, result))
    .catch(err => callback({ code: grpc.status.INTERNAL, details: err.message }));
}

const server = new grpc.Server();
server.addService(classifierProto.ImageClassifier.service, { UploadImage: uploadImage });
server.bindAsync(SERVER_ADDRESS, grpc.ServerCredentials.createInsecure(), () => {
  console.log(`Microservice B (Model) running on ${SERVER_ADDRESS}`);
});