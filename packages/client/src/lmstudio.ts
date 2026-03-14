import type { ChatMessage, LMStudioConfig } from '@mcp/shared';
import { getClientEnv } from './env.js';

/**
 * LM Studio API Client
 *
 * Connects to LM Studio's OpenAI-compatible API for local LLM inference.
 * LM Studio must be running with a model loaded.
 */
export class LMStudioClient {
  private config: Required<LMStudioConfig>;

  constructor(config: Partial<LMStudioConfig> = {}) {
    const clientEnv = getClientEnv();

    this.config = {
      baseUrl: config.baseUrl ?? clientEnv.LM_STUDIO_URL ?? 'http://localhost:1234/v1',
      model: config.model ?? clientEnv.LM_STUDIO_MODEL ?? 'local-model',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
    };
  }

  /**
   * Send a chat completion request to LM Studio
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LM Studio API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: { content: string };
        }>;
      };

      return data.choices[0]?.message.content ?? '';
    } catch (error) {
      if (
        error instanceof TypeError &&
        (error.cause as { code?: string })?.code === 'ECONNREFUSED'
      ) {
        throw new Error(
          'Cannot connect to LM Studio. Make sure LM Studio is running with "Server" enabled on port 1234.'
        );
      }
      throw error;
    }
  }

  /**
   * Generate a completion with system context for SQL assistance
   */
  async generateSQL(userMessage: string, schemaContext?: string): Promise<string> {
    const systemPrompt = `You are an expert SQL assistant. Your role is to:
1. Convert natural language questions into correct SQL queries
2. Use SQLite syntax and functions
3. Explain queries when asked
4. Be concise and accurate

${schemaContext ? `Database Schema:\n${schemaContext}` : ''}

Always respond with valid SQL when asked for queries, or clear explanations otherwise.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    return this.chat(messages);
  }

  /**
   * Explain query results in natural language
   */
  async explainResults(query: string, results: unknown[]): Promise<string> {
    const userMessage = `I executed this SQL query: ${query}\n\nResults: ${JSON.stringify(results, null, 2)}\n\nPlease explain what these results mean in plain language.`;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You are a data analyst who explains database query results in clear, natural language.',
      },
      { role: 'user', content: userMessage },
    ];

    return this.chat(messages);
  }

  /**
   * Check if LM Studio is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
