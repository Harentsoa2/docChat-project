"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { MessageSquare } from "lucide-react"
import { Empty } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { chatWithProject, listProjectMessages } from "@/lib/api/chat"
import { ChatInput } from "./chat-input"
import { ChatMessage } from "./chat-message"
import type {
  ChatMessageResponse,
  ChatResponse,
  DocumentResponse,
} from "@/lib/types"
import { ApiError } from "@/lib/types"

interface ChatSectionProps {
  projectId: string
  documents: DocumentResponse[]
}

export function ChatSection({ projectId, documents }: ChatSectionProps) {
  const queryClient = useQueryClient()
  const messagesQueryKey = ["messages", projectId] as const

  const readyDocs = documents.filter((d) => d.status === "ready")
  const hasReadyDocs = readyDocs.length > 0

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: messagesQueryKey,
    queryFn: () => listProjectMessages(projectId),
  })

  const mutation = useMutation<
    ChatResponse,
    unknown,
    string,
    { previousMessages: ChatMessageResponse[] }
  >({
    mutationFn: (content: string) => chatWithProject(projectId, { content }),
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: messagesQueryKey })

      const previousMessages =
        queryClient.getQueryData<ChatMessageResponse[]>(messagesQueryKey) ?? []

      const userMessage: ChatMessageResponse = {
        id: `optimistic-user-${crypto.randomUUID()}`,
        project_id: projectId,
        role: "user",
        content,
        sources: null,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<ChatMessageResponse[]>(
        messagesQueryKey,
        [...previousMessages, userMessage]
      )

      return { previousMessages }
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessageResponse = {
        id: `optimistic-assistant-${crypto.randomUUID()}`,
        project_id: projectId,
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<ChatMessageResponse[]>(
        messagesQueryKey,
        (currentMessages = []) => [...currentMessages, assistantMessage]
      )
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey })
    },
    onError: (error: unknown, _content, context) => {
      if (context) {
        queryClient.setQueryData(messagesQueryKey, context.previousMessages)
      }

      if (error instanceof ApiError) {
        toast.error(
          typeof error.detail === "string"
            ? error.detail
            : "Erreur lors de la requête"
        )
      } else {
        toast.error("Erreur lors de la communication avec le chat")
      }
    },
  })

  const handleSend = (content: string) => {
    mutation.mutate(content)
  }

  if (!hasReadyDocs) {
    return (
      <div className="flex h-full flex-col">
        <h2 className="mb-4 text-lg font-semibold">Chat RAG</h2>
        <Empty
          icon={MessageSquare}
          title="Aucun document prêt"
          description="Importez et attendez que des documents soient indexés pour poser des questions."
          className="flex-1"
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-4 shrink-0 text-lg font-semibold">Chat RAG</h2>
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
        <ScrollArea className="flex-1 p-4">
          {isLoadingMessages ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-muted-foreground">
                Chargement de l&apos;historique...
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-muted-foreground">
                Posez une question sur vos {readyDocs.length} document(s)
                indexé(s).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {mutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  Recherche en cours...
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        <div className="shrink-0 border-t p-4">
          <ChatInput onSend={handleSend} isLoading={mutation.isPending} />
        </div>
      </div>
    </div>
  )
}
