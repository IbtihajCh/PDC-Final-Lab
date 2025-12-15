import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

// We use require here because ai-service is a plain JS file
// @ts-ignore
const aiService = require('../ai-service');

const t = initTRPC.create();
const router = t.router;
const publicProcedure = t.procedure;

const ImageUploadInput = z.object({
  imageData: z.string(),
  filename: z.string().optional(),
});

const ClassificationOutput = z.object({
  label: z.string(),
  confidence: z.number(),
});

const imageRouter = router({
  uploadImage: publicProcedure
    .input(ImageUploadInput) 
    .output(ClassificationOutput) 
    .mutation(async ({ input }) => {
      const { imageData } = input;
      // Convert Base64 back to Buffer for the AI service
      const imageBuffer = Buffer.from(imageData, 'base64');
      
      const result = await aiService.classifyImage(imageBuffer);
      return result;
    }),
});

const appRouter = router({
  image: imageRouter,
});

export type AppRouter = typeof appRouter;

const PORT = 3001;
const app = express();

app.use(cors({ origin: '*', credentials: true })); 

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
  }),
);

app.listen(PORT, () => {
  console.log(`tRPC Server running on http://localhost:${PORT}`);
});