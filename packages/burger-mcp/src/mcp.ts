import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import { tools } from './tools.js';

export function getMcpServer() {
  const server = new McpServer({
    name: 'burger-mcp',
    version: '1.0.0',
  });
  for (const tool of tools) {
    createMcpTool(server, tool);
  }

  return server;
}

// Helper that wraps MCP tool creation
// It handles arguments typing, error handling and response formatting
export function createMcpTool(
  server: McpServer,
  options: {
    name: string;
    description: string;
    schema?: z.ZodType;
    handler: (args: z.ZodRawShape) => Promise<string>;
  },
) {
  if (options.schema) {
    server.registerTool(
      options.name,
      {
        description: options.description,
        inputSchema: options.schema as any, // Not pretty but fails to infer correctly otherwise
      },
      async (args: z.ZodRawShape) => {
        try {
          const result = await options.handler(args);
          return {
            content: [
              {
                type: 'text' as const,
                text: result,
              },
            ],
          };
        } catch (error: any) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Error executing MCP tool:', errorMessage);
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      },
    );
  } else {
    server.registerTool(
      options.name,
      {
        description: options.description,
      },
      async () => {
        try {
          const result = await options.handler(undefined as any);
          return {
            content: [
              {
                type: 'text' as const,
                text: result,
              },
            ],
          };
        } catch (error: any) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Error executing MCP tool:', errorMessage);
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      },
    );
  }
}
