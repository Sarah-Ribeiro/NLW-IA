import { FastifyInstance } from "fastify";
import { z } from "zod";
import { streamToResponse, OpenAIStream } from "ai";
import { prisma } from "../lib/prisma";
import { openai } from "../lib/openai";

// Obrigatório ser async
export async function generateAICompletionRoute(app: FastifyInstance) {
  app.post("/ai/complete", async (req, reply) => {
    const bodySchema = z.object({
      videoId: z.string().uuid(),
      prompt: z.string(),
      temperature: z.number().min(0).max(1).default(0.5),
    });

    const { videoId, prompt, temperature } = bodySchema.parse(req.body);

    // Procurar um vídeo no banco de dados com esse ID
    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      },
    });

    if (!video.transcription) {
      return reply
        .status(400)
        .send({ error: "Video transcription was not generated yet." });
    }

    const promptMessage = prompt.replace(
      "{transcription}",
      video.transcription
    );

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      temperature,
      messages: [
        {
          role: "user",
          content: promptMessage,
        },
      ],
      stream: true,
    });

    const stream = OpenAIStream(response);

    /*
      O raw permite acessar a parte interna do node
      A resposta não passa pelo fastify
      Por conta disso, o CORS precisa ser configurado de forma manual
    */
    streamToResponse(stream, reply.raw, {
      headers: {
        // Da acesso a qualquer um para usar a API
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
    });
  });
}
