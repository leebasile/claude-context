/**
 * claude-context
 * Main entry point for the claude-context MCP server
 * Provides context management and vector search capabilities for Claude
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { toolHandlers } from './tools/index.js';
import { toolDefinitions } from './tools/definitions.js';
import { logger } from './utils/logger.js';

// Load environment variables
config();

/**
 * Initialize and start the MCP server
 */
async function main(): Promise<void> {
  const server = new Server(
    {
      name: 'claude-context',
      version: process.env.npm_package_version ?? '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing available tools');
    return {
      tools: toolDefinitions,
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    logger.debug(`Calling tool: ${name}`, { args });

    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await handler(args ?? {});
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Tool execution failed: ${name}`, { error: message });
      // Include the tool name and a timestamp in the error response for easier debugging
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool ${name} at ${new Date().toISOString()}: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Connect via stdio transport
  const transport = new StdioServerTransport();

  server.onerror = (error) => {
    logger.error('MCP Server error', { error: error.message });
  };

  // Handle both SIGINT (Ctrl+C) and SIGTERM (e.g. docker stop / process managers)
  const shutdown = async () => {
    logger.info('Shutting down claude-context server...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await server.connect(transport);
  logger.info('claude-context MCP server started successfully');
}

main().catch((error) => {
  logger.error('Fatal error during startup', { error });
  process.exit(1);
});
