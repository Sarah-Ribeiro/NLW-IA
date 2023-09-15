import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { api } from "@/lib/axios";

interface Prompt {
  id: string;
  title: string;
  template: string;
}

interface PromptSelectProps {
  onPromptSelected: (template: string) => void;
}

export function PromptSelect(props: PromptSelectProps) {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);

  // Disparar uma função quando alguma info mudar
  useEffect(() => {
    api.get("/prompts").then((response) => {
      setPrompts(response.data);
    });
  }, []);

  function handlePromptSelected(promptId: string) {
    // Encontra o prompt na lista de prompts
    const selectedPrompt = prompts?.find(prompt => prompt.id === promptId)

    // Se não for retornado nenhum prompt
    if (!selectedPrompt) {
      return 
    }

    // Se o prompt for encontrado
    props.onPromptSelected(selectedPrompt.template)
  }

  return (
    // Toda vez que o usuário colocar algum valor no select, vai ser chamada a função onPromptSelected
    <Select onValueChange={handlePromptSelected}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um prompt..." />
      </SelectTrigger>
      <SelectContent>
        {/* Itens dinâmicos */}
        {/* O ponto de ? existe, porque em um primeiro momento
        esse array Prompt pode estar nulo. */}
        {prompts?.map((prompt) => {
          return (
            // O key é uma info única entre cada prompt
            // O prompt vem do DB
            <SelectItem key={prompt.id} value={prompt.id}>
              {prompt.title}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
