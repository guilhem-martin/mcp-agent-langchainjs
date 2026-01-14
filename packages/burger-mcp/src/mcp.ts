import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { burgerApiUrl } from './config.js';

export function getMcpServer() {
  const server = new McpServer({
    name: 'burger-mcp',
    version: '1.0.0',
  });

  // Add tools here
  // Get the list of available burgers
    // Get the list of available burgers
  server.registerTool(
    'get_burgers',
    {
      description: 'Get a list of all burgers in the menu',
    },
    async () => createToolResponse(async () => {
      return fetchBurgerApi('/api/burgers')
    }),
  );

    // Get a specific burger by its ID
  server.registerTool(
    'get_burger_by_id',
    {
      description: 'Get a specific burger by its ID',
      inputSchema: z.object({
        id: z.string().describe('ID of the burger to retrieve'),
      }),
    },
    async (args) => createToolResponse(async () => {
      return fetchBurgerApi(`/api/burgers/${args.id}`);
    }),
  );

  // Get the list of available toppings
  server.registerTool(
    'get_toppings',
    {
      description: 'Get a list of all toppings, optionally filtered by category',
      inputSchema: z.object({
        category: z.string().optional().describe('Filter toppings by category'),
      }),
    },
    async (args) => createToolResponse(async () => {
      const url = args.category ? `/api/toppings?category=${encodeURIComponent(args.category)}` : '/api/toppings';
      return fetchBurgerApi(url);
    }),
  );

  // Get a specific topping by its ID
  server.registerTool(
    'get_topping_by_id',
    {
      description: 'Get a specific topping by its ID',
      inputSchema: z.object({
        id: z.string().describe('ID of the topping to retrieve'),
      }),
    },
    async (args) => createToolResponse(async () => {
      return fetchBurgerApi(`/api/toppings/${args.id}`);
    }),
  );

  // Get all topping categories
  server.registerTool(
    'get_topping_categories',
    {
      description: 'Get a list of all topping categories',
    },
    async () => createToolResponse(async () => {
      return fetchBurgerApi('/api/toppings/categories');
    }),
  );

  // Get orders
  server.registerTool(
    'get_orders',
    {
      description: 'Get a list of all orders, optionally filtered by userId, status, or time period',
      inputSchema: z.object({
        userId: z.string().optional().describe('Filter orders by userId'),
        status: z.string().optional().describe('Filter orders by status (comma-separated for multiple, e.g. pending,ready)'),
        last: z.string().optional().describe('Filter orders created in the last X minutes/hours (e.g. 60m, 2h)'),
      }),
    },
    async (args) => createToolResponse(async () => {
      const params = new URLSearchParams();
      if (args.userId) params.append('userId', args.userId);
      if (args.status) params.append('status', args.status);
      if (args.last) params.append('last', args.last);
      const url = params.toString() ? `/api/orders?${params.toString()}` : '/api/orders';
      return fetchBurgerApi(url);
    }),
  );

  // Get a specific order by its ID
  server.registerTool(
    'get_order_by_id',
    {
      description: 'Get a specific order by its ID',
      inputSchema: z.object({
        orderId: z.string().describe('ID of the order to retrieve'),
      }),
    },
    async (args) => createToolResponse(async () => {
      return fetchBurgerApi(`/api/orders/${args.orderId}`);
    }),
  );

  // Place a new order
  server.registerTool(
    'place_order',
    {
      description: 'Create a new burger order. French fries are included as a side for every burger order. Maximum 5 active orders per user and 50 burgers total per order.',
      inputSchema: z.object({
        userId: z.string().describe('ID of the user placing the order'),
        nickname: z.string().optional().describe('Optional nickname for the order (only first 10 chars displayed)'),
        items: z.array(z.object({
          burgerId: z.string().describe('ID of the burger to order'),
          quantity: z.number().int().min(1).describe('Quantity of burgers (must be positive)'),
          extraToppingIds: z.array(z.string()).optional().describe('Optional list of extra topping IDs to add'),
        })).describe('List of burger items to order (maximum 50 burgers total)'),
      }),
    },
    async (args) => createToolResponse(async () => {
      return fetchBurgerApi('/api/orders', {
        method: 'POST',
        body: JSON.stringify(args),
      });
    }),
  );

  // Delete/cancel an order
  server.registerTool(
    'delete_order_by_id',
    {
      description: 'Cancel an order by its ID. The order must be in pending status and the userId must match.',
      inputSchema: z.object({
        orderId: z.string().describe('ID of the order to cancel'),
        userId: z.string().describe('ID of the user requesting the cancellation (required)'),
      }),
    },
    async (args) => createToolResponse(async () => {
      return fetchBurgerApi(`/api/orders/${args.orderId}?userId=${encodeURIComponent(args.userId)}`, {
        method: 'DELETE',
      });
    }),
  );

  return server;
}

// Wraps standard fetch to include the base URL and handle errors
async function fetchBurgerApi(url: string, options: RequestInit = {}): Promise<Record<string, any>> {
  const fullUrl = new URL(url, burgerApiUrl).toString();
  console.error(`Fetching ${fullUrl}`);
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Error fetching ${fullUrl}: ${response.statusText}`);
    }

    if (response.status === 204) {
      return { result: 'Operation completed successfully. No content returned.' };
    }

    return await response.json();
  } catch (error: any) {
    console.error(`Error fetching ${fullUrl}:`, error);
    throw error;
  }
}


// Helper to create MCP tool responses with error handling
async function createToolResponse(handler: () => Promise<Record<string, any>>) {
  try {
    const result = await handler();
    return {
      structuredContent: { result },
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result),
        }
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
}
