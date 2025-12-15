const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../proto/image-classifier.proto');
const GATEWAY_ADDRESS = '0.0.0.0:50051';
const MODEL_SERVICE_ADDRESS = 'localhost:50052';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const classifierProto = grpc.loadPackageDefinition(packageDefinition).classifier;

const modelClient = new classifierProto.ImageClassifier(
    MODEL_SERVICE_ADDRESS, 
    grpc.credentials.createInsecure()
);

function uploadImage(call, callback) {
  const start = process.hrtime.bigint();
  
  modelClient.UploadImage(call.request, (error, response) => {
    const end = process.hrtime.bigint();
    console.log(`Internal Latency (A->B): ${(Number(end - start) / 1e6).toFixed(3)} ms`);
    
    if (error) return callback(error);
    callback(null, response);
  });
}

const server = new grpc.Server();
server.addService(classifierProto.ImageClassifier.service, { UploadImage: uploadImage });
server.bindAsync(GATEWAY_ADDRESS, grpc.ServerCredentials.createInsecure(), () => {
  console.log(`Microservice A (Gateway) running on ${GATEWAY_ADDRESS}`);
});