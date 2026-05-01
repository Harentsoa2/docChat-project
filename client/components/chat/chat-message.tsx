"use client"

import { User, Bot, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import type { ChatResponse } from "@/lib/types"

interface ChatMessageProps {
  message: {
    role: "user" | "assistant"
    content: string
    sources?: ChatResponse["sources"]
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        {message.sources && message.sources.length > 0 && (
          <Collapsible className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs hover:bg-transparent">
                <FileText className="mr-1 h-3 w-3" />
                {message.sources.length} source(s)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {message.sources.map((source, index) => (
                <div
                  key={index}
                  className="rounded border bg-background p-2 text-xs"
                >
                  <p className="font-medium text-foreground">
                    {source.document} - Page {source.page}
                  </p>
                  <p className="mt-1 line-clamp-3 text-muted-foreground">
                    {source.content}
                  </p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  )
}
