# Image Classification API: REST vs tRPC vs gRPC

**Subject:** Parallel and Distributed Computing (Final Lab)  
**Student Name:** Muhammad Ibtihaj  
**Roll No:** SP23-BAI-037  
**Date:** December 15, 2025

---

## 📖 Project Overview

This project implements and compares three different API architectures:

- **REST**
- **tRPC**
- **gRPC (Unary)**

for an AI-based image classification system.  
It also demonstrates a **Microservices Architecture** using **gRPC** for internal service-to-service communication.

The main goal is to analyze performance differences in terms of:

- Response time  
- Payload size  
- Network calls and batching  
- Type safety and ease of integration  

---

## 🎯 Objectives Achieved

1. **REST API**  
   Implemented a standard HTTP/JSON-based image upload and classification endpoint.

2. **tRPC API**  
   Implemented an end-to-end type-safe RPC system with automatic request batching.

3. **gRPC (Unary)**  
   Implemented high-performance binary communication using Protocol Buffers.

4. **gRPC Microservices**  
   Implemented a decoupled architecture:
   - API Gateway (Service A)
   - AI Model Service (Service B)  
   using internal gRPC calls.

---

## 📂 Project Structure

```bash
image-classification-api/
├── ai-service.js          # Shared mock AI logic
├── proto/                 # Protocol Buffer definitions
│   └── image-classifier.proto
├── rest-api/              # Step 1: REST implementation
├── trpc-api/              # Step 2: tRPC implementation
├── grpc-api/              # Step 3: gRPC direct implementation
├── grpc-microservices/    # Step 4: gRPC microservices
│   ├── service-a/         # API Gateway
│   └── service-b/         # AI Model Service
├── client/                # Unified client for testing all protocols
└── test-images/           # Sample images for testing

```
## ⚙️ Setup & Installation

Before running any service, ensure that all required dependencies are installed for each module.

### 1. Install gRPC API dependencies
~~~bash
cd grpc-api
npm install
~~~

### 2. Install Microservices dependencies
~~~bash
cd ../grpc-microservices/service-a
npm install

cd ../service-b
npm install
~~~

### 3. Install tRPC dependencies
~~~bash
cd ../../trpc-api
npm install
~~~

### 4. Install Client dependencies
~~~bash
cd ../../client
npm install
~~~

---

## 🚀 How to Run

### Step 1: REST API (Baseline)

Standard HTTP/JSON implementation.

**Server**
~~~bash
cd rest-api
node server.js
~~~

**Client**
~~~bash
cd client
node rest-client.js
~~~

---

### Step 2: tRPC API

TypeScript-based RPC with automatic request batching.

**Server**
~~~bash
cd trpc-api
npx ts-node-dev server.ts
~~~

**Client**
~~~bash
cd client
node trpc-client.js
~~~

---

### Step 3: gRPC API (Direct Unary)

Binary Protobuf communication for maximum efficiency.

**Server**
~~~bash
cd grpc-api
node server.js
~~~

**Client**
~~~bash
cd client
node grpc-client.js
~~~

---

### Step 4: gRPC Microservices

Decoupled architecture:

**Client → Service A (Gateway) → Service B (AI Model)**

1. **Start Service B (AI Model)**
~~~bash
cd grpc-microservices/service-b
node server.js
~~~

2. **Start Service A (Gateway)**
~~~bash
cd grpc-microservices/service-a
node server.js
~~~

3. **Run Client**
~~~bash
cd client
node grpc-client.js
~~~

---

## 📊 Performance Analysis Summary

| Metric | REST API | tRPC | gRPC (Direct) | gRPC Microservices |
|------|---------|------|---------------|-------------------|
| Protocol | HTTP/1.1 (JSON) | HTTP (JSON) | HTTP/2 (Protobuf) | HTTP/2 (Internal) |
| Payload Efficiency | Moderate | Low (Base64 overhead) | High (Binary) | High (Binary) |
| Single Request Time | ~202 ms | ~346 ms | ~168 ms | ~243 ms |
| Batch Performance | Slow (Sequential) | Fast (Auto-batching) | Fast (Parallel) | Moderate |
| Type Safety | Loose | Strict (End-to-End) | Strict (Contract) | Strict (Contract) |

---

## 🔍 Key Findings

- gRPC achieved the lowest latency and smallest payload size due to binary serialization.
- tRPC provided the best developer experience with strong end-to-end type safety and automatic batching, though Base64 encoding increased payload size.
- The microservices architecture introduced slight latency due to an additional network hop while enabling independent scaling of the AI model service.

---

## 🛠️ Technologies Used

- **Runtime:** Node.js  
- **Frameworks:** Express.js, `@trpc/server`, `@grpc/grpc-js`  
- **Serialization:** JSON vs Protocol Buffers (Protobuf)  
- **Languages:** JavaScript, TypeScript  
- **Tools & Libraries:** `fs`, `path`, Zod (validation)
