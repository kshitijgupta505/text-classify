import { submitQuestion } from "@/lib/langgraph";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import {
  ChatRequestBody,
  StreamMessage,
  StreamMessageType,
  SSE_DATA_PREFIX,
  SSE_LINE_DELIMITER,
} from "@/lib/types";

export const runtime = "edge";

function sendSSEMessage(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  data: StreamMessage
) {
  const encoder = new TextEncoder();
  return writer.write(
    encoder.encode(
      `${SSE_DATA_PREFIX}${JSON.stringify(data)}${SSE_LINE_DELIMITER}`
    )
  );
}

// Function to convert numeric class labels to human-readable text
function translateClassLabel(label: string, modelId: string): string {
  // Different models have different class labels
  if (modelId === "default") {
    // Spam classifier
    const classMap: Record<string, string> = {
      "Ham": "Legitimate",
      "Spam": "Spam",
      "Phishing": "Phishing",
    };
    return classMap[label] || label;
  } else if (modelId === "sentiment") {
    // Sentiment analysis
    const classMap: Record<string, string> = {
      "1": "Positive",
      "0": "Neutral",
      "-1": "Negative",
    };
    return classMap[label] || label;
  } else {
    // Default fallback
    return label;
  }
}

// Get the appropriate Flask API endpoint based on the model
function getApiEndpoint(modelId: string): string {
  const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:5000";
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  
  switch (modelId) {
    case "fake_review":
      return `${FLASK_API_URL}/predict_review`;
    case "summarizer":
      return `${FLASK_API_URL}/summarize`;
    case "claude":
      return "claude";
    case "default":
    default:
      return `${FLASK_API_URL}/predict_email`;
  }
}

// Get the appropriate tool name for the model
function getToolName(modelId: string): string {
  switch (modelId) {
    case "fake_review":
      return "review-analysis";
    case "summarizer":
      return "text-summarizer";
    case "default":
    default:
      return "classification";
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, newMessage, chatId, modelId = "default" } =
      (await req.json()) as ChatRequestBody & { modelId?: string };
    const convex = getConvexClient();

    // Create stream with larger queue strategy for better performance
    const stream = new TransformStream({}, { highWaterMark: 1024 });
    const writer = stream.writable.getWriter();

    const response = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable buffering for nginx which is required for SSE to work properly
      },
    });

    // Handle the streaming response
    (async () => {
      try {
        // Send initial connection established message
        await sendSSEMessage(writer, { type: StreamMessageType.Connected });

        // Send user message to Convex
        await convex.mutation(api.messages.send, {
          chatId,
          content: newMessage,
        });

        // Convert messages to LangChain format
        const langChainMessages = [
          ...messages.map((msg) =>
            msg.role === "user"
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content)
          ),
          new HumanMessage(newMessage),
        ];

        let responseText = "";

        try {
          if (modelId != "claude") {
            const toolName = getToolName(modelId);
            
            // Begin prediction process
            await sendSSEMessage(writer, {
              type: StreamMessageType.ToolStart,
              tool: toolName,
              input: newMessage,
            });

            // Get the appropriate API endpoint
            const apiEndpoint = getApiEndpoint(modelId);

            // Make request to Flask API
            const flaskResponse = await fetch(apiEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ text: newMessage }),
            });

            if (!flaskResponse.ok) {
              throw new Error(`Flask API responded with status: ${flaskResponse.status}`);
            }

            // Get prediction result
            const predictionResult = await flaskResponse.json();
            
            // Process result based on model type
            let toolOutput = "";
            let classificationType = "";
            
            if (modelId === "default") {
              // Spam classifier
              const originalClass = predictionResult.class;
              const translatedClass = translateClassLabel(originalClass, modelId);
              
              toolOutput = translatedClass;
              responseText = `Your text was classified as "${translatedClass}" with ${(predictionResult.confidence * 100).toFixed(2)}% confidence.`;
              
              // Set the classification type for database saving
              classificationType = translatedClass.toLowerCase();
              
              // Save the classification to database
              await convex.mutation(api.classifications.create, {
                userId,
                type: classificationType,
                confidence: predictionResult.confidence,
                text: "You're classifying text given to you as 'Spam', 'Phishing' and 'Legitimate' only. You just need to give the reason as to why it could be so, nothing else. " + newMessage,
                timestamp: Date.now(),
              });
            } 
            else if (modelId === "sentiment") {
              // Sentiment analysis
              const sentiment = predictionResult.sentiment;
              const translatedSentiment = translateClassLabel(sentiment, modelId);
              
              toolOutput = translatedSentiment;
              responseText = `Your text has a "${translatedSentiment}" sentiment with ${(predictionResult.confidence * 100).toFixed(2)}% confidence.`;
            }
            else if (modelId === "summarizer") {
              // Text summarizer
              toolOutput = predictionResult.summary;
              responseText = `Summary: ${predictionResult.summary}`;
            }  
          
            // Send tool end event with the processed output
            await sendSSEMessage(writer, {
              type: StreamMessageType.ToolEnd,
              tool: toolName,
              output: toolOutput,
            });
            
            // Stream the response character by character
            const characters = responseText.split('');
            
            for (let i = 0; i < characters.length; i++) {
              await sendSSEMessage(writer, {
                type: StreamMessageType.Token,
                token: characters[i],
              });
              
              // Variable delay to simulate natural typing
              const isPunctuation = ['.', ',', '!', '?', ':'].includes(characters[i]);
              const delay = isPunctuation ? 
                Math.random() * 40 + 30 : // 30-70ms for punctuation
                Math.random() * 20 + 15;  // 15-35ms for regular characters
                
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          
            const eventStream = await submitQuestion(langChainMessages, chatId);

            for await (const event of eventStream) {
              if (event.event === "on_chat_model_stream") {
                const token = event.data.chunk;
                if (token) {
                  // Access the text property from the AIMessageChunk
                  const text = token.content.at(0)?.["text"];
                  if (text) {
                    responseText += text;
                    await sendSSEMessage(writer, {
                      type: StreamMessageType.Token,
                      token: text,
                    });
                  }
                }
              } else if (event.event === "on_tool_start") {
                await sendSSEMessage(writer, {
                  type: StreamMessageType.ToolStart,
                  tool: event.name || "unknown",
                  input: event.data.input,
                });
              } else if (event.event === "on_tool_end") {
                const toolMessage = new ToolMessage(event.data.output);

                await sendSSEMessage(writer, {
                  type: StreamMessageType.ToolEnd,
                  tool: toolMessage.lc_kwargs.name || "unknown",
                  output: event.data.output,
                });
              }
            }
          }

          // Send completion message
          await sendSSEMessage(writer, { type: StreamMessageType.Done });
          
          // Store the generated response in Convex
          await convex.mutation(api.messages.send, {
            chatId,
            content: responseText,  
          });
          
        } catch (streamError) {
          console.error("Error in prediction process:", streamError);
          await sendSSEMessage(writer, {
            type: StreamMessageType.Error,
            error:
              streamError instanceof Error
                ? streamError.message
                : "Prediction processing failed",
          });
        }
      } catch (error) {
        console.error("Error in stream:", error);
        await sendSSEMessage(writer, {
          type: StreamMessageType.Error,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        try {
          await writer.close();
        } catch (closeError) {
          console.error("Error closing writer:", closeError);
        }
      }
    })();

    return response;
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" } as const,
      { status: 500 }
    );
  }
}
