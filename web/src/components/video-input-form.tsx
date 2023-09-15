import { FileVideo, Upload } from "lucide-react";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";

type Status = "waiting" | "converting" | "uploading" | "generating" | "success";

const statusMessages = {
  converting: "Convertendo...",
  generating: "Transcrevendo...",
  uploading: "Carregando...",
  success: "Sucesso!",
};

interface VideoInputFormProps {
  onVideoUploaded: (id: string) => void;
}

export function VideoInputForm(props: VideoInputFormProps) {
  // Armazenar Vídeo selecionado dentro do estado
  // Monitorar a mudança de estado
  // Alteração de interface
  const [videoFile, setVideoFile] = useState<File | null>(null);
  // Aguardando o usuário selecionar um vídeo
  const [status, setStatus] = useState<Status>("waiting");

  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  // OK!
  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget;

    if (!files) {
      return;
    }

    const selectedFile = files[0];

    setVideoFile(selectedFile);
  }

  // OK!
  async function convertVideoToAudio(video: File) {
    console.log("Convert started.");

    const ffmpeg = await getFFmpeg();

    // Colocar um arquivo no contexto do ffmpeg - fetchFile converte o video para representação binária
    await ffmpeg.writeFile("input.mp4", await fetchFile(video));

    // Usado para caso esteja dando algum erro
    // ffmpeg.on("log", (log) => {
    //   console.log(log);
    // });

    ffmpeg.on("progress", (progress) => {
      // Mostra a porcetagem do progresso
      console.log("Convert progress: " + Math.round(progress.progress * 100));
    });

    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-map",
      "0:a",
      "-b:a",
      "20k",
      "-acodec",
      "libmp3lame",
      "output.mp3",
    ]);

    // Ler o arquivo output.mp3
    // FileData
    const data = await ffmpeg.readFile("output.mp3");

    // Blob -> forma de representar um dado de uma maneira mais nativa
    const audioFileBlob = new Blob([data], { type: "audio/mp3" });

    // Criar arquivo
    const audioFile = new File([audioFileBlob], "output.mp3", {
      type: "audio/mpeg",
    });

    console.log("Convert finished");

    return audioFile;
  }

  // Vai ser chamada quando o usuário fizer um submit no formulário
  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    // Evita com que sempre que haja um submit no formulário o html não regarregue a tela
    event.preventDefault();

    // Se usuário quiser acessar o valor da textarea
    const prompt = promptInputRef.current?.value;

    if (!videoFile) {
      return;
    }

    // Converter o vídeo em aúdio

    setStatus("converting");

    const audioFile = await convertVideoToAudio(videoFile);

    const data = new FormData();

    data.append("file", audioFile);

    setStatus("uploading");

    const response = await api.post("/videos", data);

    const videoId = response.data.video.id;

    setStatus("generating");

    // Gerar a transcrição do vídeo
    await api.post(`/videos/${videoId}/transcription`, {
      prompt,
    });

    setStatus("success");

    /*
      Quando o processo de upload do vídeo for terminado
      Ele vai avisar o componente App que o vídeo terminou de ser carregado 
      Colocando a informação do ID do vídeo dentro do estado videoId
    */
    props.onVideoUploaded(videoId)
  }

  // OK!
  // useMemo -> recebe uma função como parâmetro e uma segunda função
  // chamado Array de dependências
  // Pre-vizualizar o vídeo upado
  const previewURL = useMemo(() => {
    // A váriavel previewURL será carregada somente se o videoFile mudar
    if (!videoFile) {
      return null;
    }

    // Cria uma URL de pré-vizualização
    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
      <label
        htmlFor="video"
        className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
      >
        {previewURL ? (
          // O usuário não consegue interagir com o vídeo
          <video
            src={previewURL}
            controls={false}
            className="pointer-events-none absolute inset-0"
          />
        ) : (
          // Fragment
          // HTMl tag
          <>
            <FileVideo className="w-4 h-4" />
            Selecione um vídeo
          </>
        )}
      </label>

      <input
        type="file"
        id="video"
        accept="video/mp4"
        className="sr-only"
        onChange={handleFileSelected}
      />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          ref={promptInputRef}
          disabled={status !== "waiting"}
          id="transcription_prompt"
          className="h-20 leading-relaxed resize-none"
          placeholder="Inclua palavras-chave mencionadas no vídeo separadas por vírgula (,)"
        />
      </div>

      <Button
        data-success={status === "success"}
        disabled={status !== "waiting"}
        type="submit"
        className="w-full data-[success=true]:bg-emerald-400"
      >
        {status === "waiting" ? (
          <>
            Carregar vídeo
            <Upload className="w-4 h-4 ml-2" />
          </>
        ) : (
          statusMessages[status]
        )}
      </Button>
    </form>
  );
}
