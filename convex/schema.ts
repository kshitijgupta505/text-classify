import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chats: defineTable({
    title: v.string(),
    userId: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    chatId: v.id("chats"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    createdAt: v.number(),
  }).index("by_chat", ["chatId"]),

  classifications: defineTable({
    userId: v.string(),
    type: v.string(),
    confidence: v.number(),
    text: v.string(),
    timestamp: v.number(),
  })
  .index("by_user_and_date", ["userId", "timestamp"]),
});
