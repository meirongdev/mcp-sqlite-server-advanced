/**
 * Shared Zod schemas for MCP SQLite Server project
 * All business logic schemas are defined here for consistent validation
 * across server and client packages.
 */

import { z } from 'zod';

/**
 * Column information from PRAGMA table_info
 */
export const ColumnInfoSchema = z.object({
  cid: z.number(),
  name: z.string(),
  type: z.string(),
  notnull: z.number(),
  dflt_value: z.string().nullable(),
  pk: z.number(),
});

/**
 * Database table information
 */
export const TableInfoSchema = z.object({
  name: z.string(),
  columns: z.array(ColumnInfoSchema),
});

/**
 * Query result row
 */
export const QueryResultSchema = z.record(z.string(), z.unknown());

/**
 * Content item types for tool responses
 */
export const TextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
  annotations: z
    .object({
      audience: z.array(z.union([z.literal('user'), z.literal('assistant')])).optional(),
      priority: z.number().optional(),
      lastModified: z.string().optional(),
    })
    .optional(),
  _meta: z.record(z.string(), z.unknown()).optional(),
});

export const ResourceContentSchema = z.object({
  type: z.literal('resource'),
  resource: z.object({
    type: z.literal('resource'),
    uri: z.string(),
    name: z.string(),
    text: z.string(),
    mimeType: z.string().optional(),
  }),
  annotations: z
    .object({
      audience: z.array(z.union([z.literal('user'), z.literal('assistant')])).optional(),
      priority: z.number().optional(),
      lastModified: z.string().optional(),
    })
    .optional(),
  _meta: z.record(z.string(), z.unknown()).optional(),
});

export const ContentItemSchema = z.union([TextContentSchema, ResourceContentSchema]);

/**
 * Tool execution result
 */
export const ToolResultSchema = z.object({
  content: z.array(ContentItemSchema),
  isError: z.boolean().optional(),
  nextCursor: z.string().optional(),
  _meta: z.record(z.string(), z.unknown()).optional(),
});

/**
 * LM Studio configuration
 */
export const LMStudioConfigSchema = z.object({
  baseUrl: z.string().url(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().positive().optional(),
});

/**
 * Chat message for LM Studio API
 */
export const ChatMessageSchema = z.object({
  role: z.union([z.literal('system'), z.literal('user'), z.literal('assistant')]),
  content: z.string(),
});

/**
 * System prompt template
 */
export const PromptTemplateSchema = z.object({
  name: z.string(),
  systemPrompt: z.string(),
  description: z.string(),
});

// Export inferred types for backward compatibility
export type ColumnInfo = z.infer<typeof ColumnInfoSchema>;
export type TableInfo = z.infer<typeof TableInfoSchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;
export type TextContent = z.infer<typeof TextContentSchema>;
export type ResourceContent = z.infer<typeof ResourceContentSchema>;
export type ContentItem = z.infer<typeof ContentItemSchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;
export type LMStudioConfig = z.infer<typeof LMStudioConfigSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;
