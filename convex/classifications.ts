import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Logging configuration
const LOGGING = {
  ENABLED: true,
  LEVELS: {
    INFO: true,
    DEBUG: true,
    ERROR: true
  },
  ACTIONS: {
    CREATE: true,
    QUERY: true,
    STATS: true,
    DELETE: true
  }
};

// Utility function for formatting log messages
function formatLog(action: string, details: any) {
  let icon = "🔍";
  
  switch (action) {
    case "CREATE":
      icon = "➕";
      break;
    case "QUERY":
      icon = "🔎";
      break;
    case "STATS":
      icon = "📊";
      break;
    case "ERROR":
      icon = "❌";
      break;
    case "SUCCESS":
      icon = "✅";
      break;
    case "DELETE":
      icon = "🗑️";
      break;
  }
  
  return `${icon} ${action}: ${JSON.stringify(details, null, 2)}`;
}

// Logger function with different log levels
function log(level: "INFO" | "DEBUG" | "ERROR", action: string, details: any) {
  if (!LOGGING.ENABLED || !LOGGING.LEVELS[level]) return;
  
  if (action && !LOGGING.ACTIONS[action as keyof typeof LOGGING.ACTIONS]) return;
  
  switch (level) {
    case "INFO":
      console.log(formatLog(action, details));
      break;
    case "DEBUG":
      console.debug(formatLog(action, details));
      break;
    case "ERROR":
      console.error(formatLog("ERROR", { action, ...details }));
      break;
  }
}

// Define interfaces for the classification system
interface DailyStats {
  date: string;
  legitimate: number;
  spam: number;
  phishing: number;
}

interface StatsByDate {
  [key: string]: DailyStats;
}

// Define your database schema for clarity
type ClassificationType = "legitimate" | "spam" | "phishing";

// Define the structure of your classifications table
interface ClassificationDoc {
  userId: string;
  type: ClassificationType;
  confidence: number;
  text: string;
  timestamp: number;
  metadata: Record<string, any>;
  createdAt: number;
}

// Create a new classification
export const create = mutation({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal("legitimate"),
      v.literal("spam"),
      v.literal("phishing")
    ),
    confidence: v.number(),
    text: v.string(),
    timestamp: v.optional(v.number()),
    metadata: v.optional(v.object({}))
  },
  handler: async (ctx, args) => {
    log("INFO", "CREATE", {
      userId: args.userId,
      type: args.type,
      confidence: args.confidence,
      textLength: args.text.length
    });
    
    try {
      // Use current timestamp if not provided
      const timestamp = args.timestamp || Date.now();
      
      // Insert the classification into the database
      const id = await ctx.db.insert("classifications", {
        userId: args.userId,
        type: args.type,
        confidence: args.confidence,
        text: args.text,
        timestamp,
        metadata: args.metadata || {},
        createdAt: Date.now()
      } as ClassificationDoc);
      
      log("INFO", "SUCCESS", {
        operation: "create",
        classificationId: id,
        type: args.type,
        userId: args.userId
      });
      
      return id;
    } catch (error) {
      log("ERROR", "CREATE", {
        error: error instanceof Error ? error.message : String(error),
        userId: args.userId,
        type: args.type
      });
      throw error;
    }
  },
});

// Get classifications by user
export const getByUser = query({
  args: { 
    userId: v.string(),
    limit: v.optional(v.number()),
    startTimestamp: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    log("INFO", "QUERY", {
      operation: "getByUser",
      userId: args.userId,
      limit: args.limit,
      startTimestamp: args.startTimestamp
    });
    
    try {
      // Start with a basic query
      const query = ctx.db.query("classifications");
      
      // Apply userId filter
      const withUserFilter = query.filter(q => q.eq(q.field("userId"), args.userId));
      
      // Apply timestamp filter if provided
      const withFilters = args.startTimestamp !== undefined
        ? withUserFilter.filter(q => q.gte(q.field("timestamp"), args.startTimestamp as number))
        : withUserFilter;
      
      // Apply ordering
      const ordered = withFilters.order("desc");
      
      // Apply limit and execute query
      const classifications = args.limit !== undefined
        ? await ordered.take(args.limit)
        : await ordered.collect();
      
      log("INFO", "SUCCESS", {
        operation: "getByUser",
        userId: args.userId,
        count: classifications.length
      });
      
      return classifications;
    } catch (error) {
      log("ERROR", "QUERY", {
        operation: "getByUser",
        userId: args.userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },
});

// Get recent classification stats
export const getRecentStats = query({
  args: { 
    userId: v.string(),
    days: v.number()
  },
  handler: async (ctx, args) => {
    log("INFO", "STATS", {
      operation: "getRecentStats",
      userId: args.userId,
      days: args.days
    });
    
    try {
      // Get the date range we're interested in
      const now = new Date();
      const startDate = new Date();
      startDate.setDate(now.getDate() - args.days + 1);
      startDate.setHours(0, 0, 0, 0);
      
      // Convert to timestamps for the database query
      const startTimestamp = startDate.getTime();
      
      log("DEBUG", "STATS", {
        operation: "getRecentStats",
        startDate: startDate.toISOString(),
        startTimestamp
      });
      
      // Get all classifications for this user in the given time range
      const query = ctx.db.query("classifications");
      const filtered = query.filter(q => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("timestamp"), startTimestamp)
        )
      );
      const classifications = await filtered.collect();
      
      log("DEBUG", "STATS", {
        operation: "getRecentStats",
        classificationsFound: classifications.length
      });
      
      // Group classifications by date and type
      const statsByDate: StatsByDate = {};
      
      // Initialize all dates with zero counts
      for (let i = 0; i < args.days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        statsByDate[dateStr] = {
          date: dateStr,
          legitimate: 0,
          spam: 0,
          phishing: 0
        };
      }
      
      // Count each classification
      for (const cls of classifications) {
        const date = new Date(cls.timestamp);
        const dateStr = date.toISOString().split('T')[0];
        
        if (statsByDate[dateStr]) {
          // Increment the correct counter based on classification type
          if (cls.type === "legitimate") {
            statsByDate[dateStr].legitimate++;
          } else if (cls.type === "spam") {
            statsByDate[dateStr].spam++;
          } else if (cls.type === "phishing") {
            statsByDate[dateStr].phishing++;
          }
        }
      }
      
      // Convert to array and sort by date
      const result = Object.values(statsByDate).sort((a, b) => 
        a.date.localeCompare(b.date)
      );
      
      log("INFO", "SUCCESS", {
        operation: "getRecentStats",
        userId: args.userId,
        days: args.days,
        entriesCount: result.length
      });
      
      return result;
    } catch (error) {
      log("ERROR", "STATS", {
        operation: "getRecentStats",
        userId: args.userId,
        days: args.days,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },
});

// Get classification distribution stats
export const getDistributionStats = query({
  args: { 
    userId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    log("INFO", "STATS", {
      operation: "getDistributionStats",
      userId: args.userId,
      startDate: args.startDate,
      endDate: args.endDate
    });
    
    try {
      // Use current timestamp as end date if not provided
      const endTimestamp = args.endDate || Date.now();
      
      // Set default start date to 30 days ago if not provided
      const startTimestamp = args.startDate || (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })();
      
      // Get classifications in the given time range
      const query = ctx.db.query("classifications");
      const filtered = query.filter(q => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("timestamp"), startTimestamp),
          q.lte(q.field("timestamp"), endTimestamp)
        )
      );
      const classifications = await filtered.collect();
      
      // Count classifications by type
      const stats = {
        legitimate: 0,
        spam: 0,
        phishing: 0,
        total: classifications.length,
        confidenceAvg: {
          legitimate: 0,
          spam: 0,
          phishing: 0
        }
      };
      
      // Calculate totals and prepare for averages
      const confidenceSums = {
        legitimate: 0,
        spam: 0,
        phishing: 0
      };
      
      for (const cls of classifications) {
        stats[cls.type as keyof typeof stats]++;
        confidenceSums[cls.type as keyof typeof confidenceSums] += cls.confidence;
      }
      
      // Calculate averages
      if (stats.legitimate > 0) {
        stats.confidenceAvg.legitimate = confidenceSums.legitimate / stats.legitimate;
      }
      if (stats.spam > 0) {
        stats.confidenceAvg.spam = confidenceSums.spam / stats.spam;
      }
      if (stats.phishing > 0) {
        stats.confidenceAvg.phishing = confidenceSums.phishing / stats.phishing;
      }
      
      log("INFO", "SUCCESS", {
        operation: "getDistributionStats",
        userId: args.userId,
        totalClassifications: stats.total
      });
      
      return stats;
    } catch (error) {
      log("ERROR", "STATS", {
        operation: "getDistributionStats",
        userId: args.userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },
});

// Delete a classification
export const remove = mutation({
  args: {
    id: v.id("classifications")
  },
  handler: async (ctx, args) => {
    log("INFO", "DELETE", {
      operation: "remove",
      classificationId: args.id
    });
    
    try {
      // Get the classification first to log its details
      const classification = await ctx.db.get(args.id);
      
      if (!classification) {
        log("ERROR", "DELETE", {
          classificationId: args.id,
          error: "Classification not found"
        });
        throw new Error("Classification not found");
      }
      
      // Delete the classification
      await ctx.db.delete(args.id);
      
      log("INFO", "SUCCESS", {
        operation: "remove",
        classificationId: args.id,
        userId: classification.userId,
        type: classification.type
      });
      
      return true;
    } catch (error) {
      log("ERROR", "DELETE", {
        classificationId: args.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },
});
