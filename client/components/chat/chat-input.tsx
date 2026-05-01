"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"

interface ChatInputProps {
  onSend: (content: string) => void
  isLoading: boolean
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [inputValue, setInputValue] = useState("")

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onSend(inputValue.trim())
      setInputValue("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (inputValue.trim() && !isLoading) {
        onSend(inputValue.trim())
        setInputValue("")
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Posez une question sur vos documents..."
        className="min-h-[44px] resize-none"
        rows={1}
        disabled={isLoading}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!inputValue.trim() || isLoading}
        aria-label="Envoyer"
      >
        {isLoading ? <Spinner /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  )
}
