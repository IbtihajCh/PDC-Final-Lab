import express from 'express';
import cors from 'cors';
import { initTRPC } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import multer from 'multer';
import { z } from 'zod';
import { classifyImage } from '../ai-service';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const t = initTRPC.create();

const router = t.router;
const publicProcedure = t.procedure;

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

let uploadedFiles: Map<string, Buffer> = new Map();

const appRouter = router({
  uploadImage: publicProcedure
    .input(z.object({
      imageId: z.string(),
      imageName: z.string()
    }))
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      
      const imageBuffer = uploadedFiles.get(input.imageId);
      
      if (!imageBuffer) {
        throw new Error('Image not found');
      }

      console.log(`\nProcessing: ${input.imageName} (${imageBuffer.length} bytes)`);

      const result = await classifyImage(imageBuffer);
      
      const duration = Date.now() - startTime;
      const payloadSize = JSON.stringify(result).length;
      
      console.log(`[tRPC Metrics]`);
      console.log(`Response Time: ${duration}ms`);
      console.log(`Payload Size: ${payloadSize} bytes`);
      
      uploadedFiles.delete(input.imageId);
      
      return {
        ...result,
        metadata: {
          responseTime: duration,
          payloadSize: payloadSize
        }
      };
    }),

  uploadImages: publicProcedure
    .input(z.object({
      imageIds: z.array(z.string()),
      imageNames: z.array(z.string())
    }))
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      
      console.log(`\nProcessing ${input.imageIds.length} images`);

      const results = [];
      
      for (let i = 0; i < input.imageIds.length; i++) {
        const imageBuffer = uploadedFiles.get(input.imageIds[i]);
        
        if (imageBuffer) {
          const result = await classifyImage(imageBuffer);
          results.push({
            filename: input.imageNames[i],
            ...result
          });
          uploadedFiles.delete(input.imageIds[i]);
        }
      }
      
      const duration = Date.now() - startTime;
      const payloadSize = JSON.stringify({ results }).length;
      
      console.log(`[tRPC Metrics]`);
      console.log(`Response Time: ${duration}ms`);
      console.log(`Payload Size: ${payloadSize} bytes`);
      
      return {
        count: results.length,
        results,
        metadata: {
          responseTime: duration,
          payloadSize: payloadSize
        }
      };
    }),

  health: publicProcedure.query(() => {
    return { status: 'OK', service: 'tRPC API' };
  })
});

export type AppRouter = typeof appRouter;

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
  })
);

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const imageId = `${Date.now()}-${Math.random()}`;
  uploadedFiles.set(imageId, req.file.buffer);
  
  res.json({ 
    imageId, 
    imageName: req.file.originalname,
    size: req.file.size
  });
});

app.post('/upload-multiple', upload.array('images', 10), (req, res) => {
  if (!req.files || !Array.isArray(req.files)) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  
  const uploads = req.files.map(file => {
    const imageId = `${Date.now()}-${Math.random()}`;
    uploadedFiles.set(imageId, file.buffer);
    return {
      imageId,
      imageName: file.originalname,
      size: file.size
    };
  });
  
  res.json({ uploads });
});

app.listen(PORT, () => {
  console.log(`\ntRPC Server running on http://localhost:${PORT}`);
  console.log(`tRPC endpoint: http://localhost:${PORT}/trpc`);
  console.log(`Upload endpoint: http://localhost:${PORT}/upload\n`);
});