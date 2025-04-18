"use client";

import { useEffect, useRef, useState } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ChatRequestBody, StreamMessageType } from "@/lib/types";
import WelcomeMessage from "@/components/WelcomeMessage";
import { createSSEParser } from "@/lib/SSEParser";
import { MessageBubble } from "@/components/MessageBubble";
import { ArrowRight, ChevronDown } from "lucide-react";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

// Added model selector components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Model options
const MODEL_OPTIONS = [
  { id: "default", name: "Spam Classifier" },
  { id: "fake_review", name: "Fake Review Classifier" },
  { id: "summarizer", name: "Text Summarizer" },
  { id: "claude", name: "Claude" },
];

interface ChatInterfaceProps {
  chatId: Id<"chats">;
  initialMessages: Doc<"messages">[];
}

export default function ChatInterface({
  chatId,
  initialMessages,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Doc<"messages">[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  const [selectedModel, setSelectedModel] = useState("default");
  const [currentTool, setCurrentTool] = useState<{
    name: string;
    input: unknown;
    pending: boolean;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedResponse]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to accurately calculate new height
      textarea.style.height = 'auto';
      // Set the height to scrollHeight to fit all content
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const formatToolOutput = (output: unknown): string => {
    if (typeof output === "string") return output;
    return JSON.stringify(output, null, 2);
  };

  const formatTerminalOutput = (
    tool: string,
    input: unknown,
    output: unknown
  ) => {
    const terminalHtml = `<div class="bg-[#1e1e1e] text-white font-mono p-2 rounded-md my-2 overflow-x-auto whitespace-normal max-w-[600px]">
      <div class="flex items-center gap-1.5 border-b border-gray-700 pb-1">
        <span class="text-red-500">●</span>
        <span class="text-yellow-500">●</span>
        <span class="text-green-500">●</span>
        <span class="text-gray-400 ml-1 text-sm">~/${tool}</span>
      </div>
      <div class="text-gray-400 mt-1">$ Input</div>
      <pre class="text-yellow-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${formatToolOutput(input)}</pre>
      <div class="text-gray-400 mt-2">$ Output</div>
      <pre class="text-green-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${formatToolOutput(output)}</pre>
    </div>`;

    return `---START---\n${terminalHtml}\n---END---`;
  };

  /**
   * Processes a ReadableStream from the SSE response.
   * This function continuously reads chunks of data from the stream until it's done.
   * Each chunk is decoded from Uint8Array to string and passed to the callback.
   */
  const processStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (chunk: string) => Promise<void>
  ) => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await onChunk(new TextDecoder().decode(value));
      }
    } finally {
      reader.releaseLock();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Reset UI state for new message
    setInput("");
    setStreamedResponse("");
    setCurrentTool(null);
    setIsLoading(true);

    // Add user's message immediately for better UX
    const optimisticUserMessage: Doc<"messages"> = {
      _id: `temp_${Date.now()}`,
      chatId,
      content: trimmedInput,
      role: "user",
      createdAt: Date.now(),
    } as Doc<"messages">;

    setMessages((prev) => [...prev, optimisticUserMessage]);

    // Track complete response for saving to database
    let fullResponse = "";
    // Track tools in progress to handle tool output correctly
    let toolsInProgress = new Map();

    try {
      // Prepare chat history and new message for API
      const requestBody: ChatRequestBody = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        newMessage: trimmedInput,
        chatId,
        // Include the selected model
        modelId: selectedModel,
      };

      // Get the appropriate API endpoint based on the selected model
      const apiEndpoint = "/api/chat/stream";

      // Initialize SSE connection
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error("No response body available");

      // Create SSE parser and stream reader
      const parser = createSSEParser();
      const reader = response.body.getReader();

      // Process the stream chunks
      await processStream(reader, async (chunk) => {
        // Parse SSE messages from the chunk
        const messages = parser.parse(chunk);

        // Handle each message based on its type
        for (const message of messages) {
          switch (message.type) {
            case StreamMessageType.Token:
              // Handle streaming tokens (normal text response)
              if ("token" in message) {
                fullResponse += message.token;
                setStreamedResponse(fullResponse);
              }
              break;

            case StreamMessageType.ToolStart:
              // Handle start of tool execution (e.g. API calls, file operations)
              if ("tool" in message) {
                // Store tool info but don't display it yet - wait for the ToolEnd event
                toolsInProgress.set(message.tool, {
                  name: message.tool,
                  input: message.input
                });
                
                // Update current tool state for UI
                setCurrentTool({
                  name: message.tool,
                  input: message.input,
                  pending: true
                });
                
                // Don't add anything to fullResponse here
              }
              break;

            case StreamMessageType.ToolEnd:
              // Handle completion of tool execution
              if ("tool" in message) {
                const toolInfo = toolsInProgress.get(message.tool);
                
                if (toolInfo) {
                  // Add the complete tool output to the response
                  fullResponse += formatTerminalOutput(
                    message.tool,
                    toolInfo.input,
                    message.output
                  );
                  
                  setStreamedResponse(fullResponse);
                  toolsInProgress.delete(message.tool);
                  
                  // Clear current tool state
                  setCurrentTool(null);
                }
              }
              break;

            case StreamMessageType.Error:
              // Handle error messages from the stream
              if ("error" in message) {
                throw new Error(message.error);
              }
              break;

            case StreamMessageType.Done:
              // Handle completion of the entire response
              const assistantMessage: Doc<"messages"> = {
                _id: `temp_assistant_${Date.now()}`,
                chatId,
                content: fullResponse,
                role: "assistant",
                createdAt: Date.now(),
              } as Doc<"messages">;

              setMessages((prev) => [...prev, assistantMessage]);

              // Save the complete message to the database
              const convex = getConvexClient();
              await convex.mutation(api.messages.store, {
                chatId,
                content: fullResponse,
                role: "assistant",
              });

              setStreamedResponse("");
              return;
          }
        }
      });
    } catch (error) {
      // Handle any errors during streaming
      console.error("Error sending message:", error);
      // Remove the optimistic user message if there was an error
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== optimisticUserMessage._id)
      );
      setStreamedResponse(
        formatTerminalOutput(
          "error",
          "Failed to process message",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key presses in the textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Shift+Enter is pressed, add a new line instead of submitting
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <main className="flex flex-col h-[calc(100vh-theme(spacing.14))]">
      {/* Messages container */}
      <section className="flex-1 overflow-y-auto bg-gray-50 p-2 md:p-0">
        <div className="max-w-4xl mx-auto p-4 space-y-3">
          {messages?.length === 0 && <WelcomeMessage />}

          {messages?.map((message: Doc<"messages">) => (
            <MessageBubble
              key={message._id}
              content={message.content}
              isUser={message.role === "user"}
            />
          ))}

          {streamedResponse && <MessageBubble content={streamedResponse} />}

          {/* Loading indicator */}
          {isLoading && !streamedResponse && (
            <div className="flex justify-start animate-in fade-in-0">
              <div className="rounded-2xl px-4 py-3 bg-white text-gray-900 rounded-bl-none shadow-sm ring-1 ring-inset ring-gray-200">
                <div className="flex items-center gap-1.5">
                  {[0.3, 0.15, 0].map((delay, i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `-${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </section>

      {/* Input form */}
      <footer className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <div className="relative flex items-center">
            {/* Model Selector */}
            <div className="mr-2">
              <Select 
                value={selectedModel} 
                onValueChange={setSelectedModel}
                disabled={isLoading}
              >
                <SelectTrigger className="h-12 w-[140px] bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Message Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AI Agent..."
              className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500 resize-none min-h-[3rem] max-h-[200px] overflow-y-auto scrollbar-hide"
              disabled={isLoading}
              rows={1}
              style={{
                scrollbarWidth: 'none', /* Firefox */
                msOverflowStyle: 'none', /* IE and Edge */
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`absolute right-1.5 rounded-xl h-9 w-9 p-0 flex items-center justify-center transition-all ${
                input.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <ArrowRight />
            </Button>
          </div>
          <style jsx global>{`
            /* Hide scrollbar for Chrome, Safari and Opera */
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </form>
      </footer>
    </main>
  );
}
