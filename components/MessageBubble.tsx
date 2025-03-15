"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@clerk/nextjs";
import { BotIcon } from "lucide-react";

interface MessageBubbleProps {
  content: string;
  isUser?: boolean;
}

const formatMessage = (content: string): string => {
  // First unescape backslashes
  content = content.replace(/\\\\/g, "\\");

  // Then handle newlines
  content = content.replace(/\\n/g, "\n");

  // Extract content between markers exactly once
  let formattedContent = content;
  
  const startMarker = "---START---";
  const endMarker = "---END---";
  
  // Only process contents with markers
  if (content.includes(startMarker) && content.includes(endMarker)) {
    // Process each terminal output section
    const sections = [];
    let remainingContent = content;
    
    while (remainingContent.includes(startMarker) && remainingContent.includes(endMarker)) {
      // Find the start and end of the current section
      const startIndex = remainingContent.indexOf(startMarker);
      const endIndex = remainingContent.indexOf(endMarker, startIndex) + endMarker.length;
      
      if (startIndex !== -1 && endIndex !== -1) {
        // Add text before the current section
        if (startIndex > 0) {
          sections.push(remainingContent.substring(0, startIndex));
        }
        
        // Extract the section content without markers
        const sectionContent = remainingContent.substring(
          startIndex + startMarker.length, 
          endIndex - endMarker.length
        ).trim();
        
        sections.push(sectionContent);
        
        // Update remaining content
        remainingContent = remainingContent.substring(endIndex);
      } else {
        // If something went wrong, just add the remaining content
        sections.push(remainingContent);
        break;
      }
    }
    
    // Add any remaining content after the last section
    if (remainingContent) {
      sections.push(remainingContent);
    }
    
    formattedContent = sections.join('');
  }

  // Trim any extra whitespace
  return formattedContent.trim();
};

// Function to get readable model name
const getModelName = (modelId: string): string => {
  switch (modelId) {
    case 'default':
      return 'Spam Classifier';
    case 'sentiment':
      return 'Sentiment Analysis';
    case 'summarizer':
      return 'Text Summarizer';
    default:
      return modelId;
  }
};

export function MessageBubble({ content, isUser = false }: MessageBubbleProps) {
  const { user } = useUser();

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-2xl px-4 py-2.5 max-w-[85%] md:max-w-[75%] shadow-sm ring-1 ring-inset relative ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none ring-blue-700"
            : "bg-white text-gray-900 rounded-bl-none ring-gray-200"
        }`}
      >
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: formatMessage(content) }} />
        </div>
        <div
          className={`absolute bottom-0 ${
            isUser
              ? "right-0 translate-x-1/2 translate-y-1/2"
              : "left-0 -translate-x-1/2 translate-y-1/2"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full border-2 ${
              isUser ? "bg-white border-gray-100" : "bg-blue-600 border-white"
            } flex items-center justify-center shadow-sm`}
          >
            {isUser ? (
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback>
                  {user?.firstName?.charAt(0)}
                  {user?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <BotIcon className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
