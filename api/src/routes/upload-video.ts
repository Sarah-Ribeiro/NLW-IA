import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import { prisma } from "../lib/prisma";
// Módulo do Node
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
// Aguardar que todo o upload finalize
import { pipeline } from "node:stream";
import { promisify } from "node:util";

// promisify -> promise
const pump = promisify(pipeline);

// Obrigatório ser async
export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    // Config
    limits: {
      // Tamanho máximo do arquivo
      // 1mb
      fileSize: 1_048_576 * 25, // 25mb
    },
  });

  app.post("/videos", async (request, reply) => {
    // Pegar o arquivo
    const data = await request.file();

    // Erro
    if (!data) {
      return reply.status(400).send({ error: "Missing file input." });
    }

    const extension = path.extname(data.filename);

    if (extension !== ".mp3") {
      return reply
        .status(400)
        .send({ error: "Invalid input type, please upload a MP3" });
    }

    // Basename -> retorna o nome do arquivo sem extensão
    const fileBaseName = path.basename(data.filename, extension);
    // Nome original do arquivo - ID - Extensão
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`;

    const uploadDestination = path.resolve(
      __dirname,
      "../../tmp",
      fileUploadName
    );

    // Upload do arquivo/ dados do arquivo - Escreve o arquivo aos poucos
    await pump(data.file, fs.createWriteStream(uploadDestination));

    const video = await prisma.video.create({
      data: {
       nome: data.filename, 
       path: uploadDestination
      }
    })

    return {video};
  });
}
