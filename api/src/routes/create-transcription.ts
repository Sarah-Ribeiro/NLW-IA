import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createReadStream } from "node:fs";
import { prisma } from "../lib/prisma";
import { openai } from "../lib/openai";

// Obrigatório ser async
export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post("/videos/:videoId/transcription", async (req) => {
    const paramsSchema = z.object({
      videoId: z.string().uuid(),
    });

    // O parse válida se o req.params está seguindo o formato do paramsSchema
    const { videoId } = paramsSchema.parse(req.params);

    const bodySchema = z.object({
      prompt: z.string(),
    });

    const { prompt } = bodySchema.parse(req.body);

    // Encontra o vídeo se não é lançado um erro para o usuário
    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      },
    });

    const videoPath = video.path;

    // Caminho para ler o arquivo
    const audioReadStream = createReadStream(videoPath);

    const response = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      language: "pt",
      response_format: "json",
      // Criatividade ou precisão - 0 até 1
      temperature: 0,
      // Palavras-chaves
      prompt,
    });

    const transcription = response.text;

    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        transcription,
      },
    });

    return { transcription };
  });
}
