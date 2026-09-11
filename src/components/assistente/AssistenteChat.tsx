import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Compass, RotateCcw, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import assistenteImg from "@/assets/assistente-sisagro.png";
import { getTourDaRota, iniciarTour, getTour } from "@/lib/tours";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistente-ajuda`;

const SUGESTOES_POR_ROTA: Record<string, string[]> = {
  "/entrada-colheita": [
    "Como registro uma entrada de colheita?",
    "Como o sistema calcula os descontos de umidade e impureza?",
  ],
  "/notas-deposito": [
    "Como emitir uma nota de depósito?",
    "Por que um produtor não aparece na lista?",
  ],
  "/transferencias": [
    "Como faço uma transferência de depósito?",
    "Posso transferir mais que o saldo?",
  ],
  "/compra-cereais": ["Como lanço uma compra de cereais?", "Quais impostos são aplicados na compra?"],
  "/vendas-producao": ["Como funciona contrato e remessa?", "Como emito a NF-e da remessa?"],
  "/entradas-nfe": ["Como manifestar uma nota recebida?", "Por que o XML não está disponível?"],
  "/relatorios": ["Quais relatórios existem?", "Como gerar o relatório de colheita diária?"],
};

const SUGESTOES_PADRAO = [
  "Como funciona o saldo do produtor?",
  "Como registro uma entrada de colheita?",
  "Como emito uma NF-e de venda?",
];

interface AssistenteChatProps {
  onFecharPainel: () => void;
}

export function AssistenteChat({ onFecharPainel }: AssistenteChatProps) {
  const location = useLocation();
  const rotaAtual = location.pathname;
  const rotaRef = useRef(rotaAtual);
  rotaRef.current = rotaAtual;

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: ENDPOINT,
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          };
        },
        body: () => ({ rotaAtual: rotaRef.current }),
      }),
    [],
  );

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    id: "assistente-ajuda",
    transport,
  });

  const carregando = status === "submitted" || status === "streaming";

  const focarComposer = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    focarComposer();
  }, [focarComposer]);

  useEffect(() => {
    if (status === "ready") focarComposer();
  }, [status, focarComposer]);

  const enviar = useCallback(
    (texto: string) => {
      const valor = texto.trim();
      if (!valor || carregando) return;
      setInput("");
      void sendMessage({ text: valor });
      focarComposer();
    },
    [carregando, sendMessage, focarComposer],
  );

  const tourDaTela = getTourDaRota(rotaAtual);

  const executarTour = useCallback(
    (id: string) => {
      onFecharPainel();
      setTimeout(() => iniciarTour(id), 350);
    },
    [onFecharPainel],
  );

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="gap-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <img
                src={assistenteImg}
                alt="Assistente do Sisagro"
                width={96}
                height={96}
                loading="lazy"
                className="h-20 w-20"
              />
              <div>
                <p className="font-semibold text-foreground">Como posso ajudar?</p>
                <p className="text-sm text-muted-foreground">
                  Pergunte sobre qualquer tela do Sisagro ou sobre os dados da sua empresa.
                </p>
              </div>
              <div className="mt-2 flex w-full flex-col gap-2">
                {(SUGESTOES_POR_ROTA[rotaAtual] ?? SUGESTOES_PADRAO).map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    className="h-auto justify-start whitespace-normal py-2 text-left text-sm"
                    onClick={() => enviar(s)}
                  >
                    {s}
                  </Button>
                ))}
                {tourDaTela && (
                  <Button variant="secondary" className="justify-start" onClick={() => executarTour(tourDaTela.id)}>
                    <Compass className="mr-2 h-4 w-4" />
                    Fazer o tour desta tela
                  </Button>
                )}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent
                className={cn(
                  message.role === "assistant" && "bg-transparent p-0 text-foreground",
                  message.role === "user" && "bg-primary text-primary-foreground",
                )}
              >
                {message.parts.map((part, index) => {
                  const key = `${message.id}-${index}`;

                  if (part.type === "text") {
                    return <MessageResponse key={key}>{part.text}</MessageResponse>;
                  }

                  if (part.type === "tool-iniciar_tour") {
                    const output = part.output as { tour_id?: string; titulo?: string } | undefined;
                    if (part.state !== "output-available" || !output?.tour_id || !getTour(output.tour_id)) {
                      return null;
                    }
                    return (
                      <Button key={key} className="my-1" size="sm" onClick={() => executarTour(output.tour_id!)}>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Mostrar na tela: {output.titulo}
                      </Button>
                    );
                  }

                  if (part.type.startsWith("tool-")) {
                    const toolPart = part as unknown as {
                      type: string;
                      state: Parameters<typeof ToolHeader>[0]["state"];
                      input?: unknown;
                      output?: unknown;
                      errorText?: string;
                    };
                    return (
                      <Tool defaultOpen={false} key={key}>
                        <ToolHeader state={toolPart.state} type={toolPart.type as `tool-${string}`} />
                        <ToolContent>
                          <ToolInput input={toolPart.input} />
                          <ToolOutput errorText={toolPart.errorText} output={toolPart.output} />
                        </ToolContent>
                      </Tool>
                    );
                  }

                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" && <Shimmer>Pensando...</Shimmer>}

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error.message || "Não consegui responder agora. Tente novamente."}
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3">
        {messages.length > 0 && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMessages([]);
                focarComposer();
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Nova conversa
            </Button>
            {tourDaTela && (
              <Button variant="ghost" size="sm" onClick={() => executarTour(tourDaTela.id)}>
                <Compass className="mr-2 h-4 w-4" />
                Tour desta tela
              </Button>
            )}
          </div>
        )}

        <PromptInput
          onSubmit={(_message, event) => {
            event.preventDefault();
            enviar(input);
          }}
        >
          <PromptInputTextarea
            ref={textareaRef}
            autoFocus
            placeholder="Escreva sua dúvida sobre o Sisagro..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={!input.trim() && !carregando} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
        <p className="mt-2 text-xs text-muted-foreground">
          O assistente apenas consulta e explica: ele não altera nem exclui dados.
        </p>
      </div>
    </div>
  );
}
