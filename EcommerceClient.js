class EcommerceClient {
    constructor(config = {}) {
      this.baseURL = config.baseURL || 'https://your-api-endpoint.amazonaws.com';
      this.timeout = config.timeout || 5000;
      this.headers = {
        'Content-Type': 'application/json',
        ...(config.headers || {})
      };
    }
  
    // Helper method to handle API calls
    async fetchWithTimeout(endpoint, options = {}) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
  
      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers: this.headers,
          signal: controller.signal
        });
  
        const responseData = await response.json().catch(() => ({}));
  
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} - ${responseData.error || response.statusText || 'Unknown error'} 
            \nEndpoint: ${endpoint}
            \nResponse: ${JSON.stringify(responseData)}`);
        }
  
        return responseData.data;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  
    // Users
    async getAllUsers() {
      return this.fetchWithTimeout('/users', {
        method: 'GET'
      });
    }
  
    // Sales
    async getSales() {
      return this.fetchWithTimeout('/sales', {
        method: 'GET'
      });
    }
  
    // Inventory
    async getInventory() {
      return this.fetchWithTimeout('/inventory', {
        method: 'GET'
      });
    }
  
    async updateInventory(productId, warehouseId, quantity) {
      return this.fetchWithTimeout('/inventory', {
        method: 'PUT',
        body: JSON.stringify({
          product_id: productId,
          warehouse_id: warehouseId,
          quantity
        })
      });
    }
  
    // Fulfillment
    async createFulfillment(orderId, warehouseId, items) {
      return this.fetchWithTimeout('/fulfillment', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId,
          warehouse_id: warehouseId,
          items
        })
      });
    }
  
    async getFulfillmentStatus(fulfillmentId) {
      return this.fetchWithTimeout(`/fulfillment/${fulfillmentId}`, {
        method: 'GET'
      });
    }
  }
  
  // Example usage
  const runExample = async () => {
    const client = new EcommerceClient({
      baseURL: 'https://your-api-endpoint.amazonaws.com',
      timeout: 5000,
      headers: {
        'Authorization': 'Bearer your-token-here'
      }
    });
  
    try {
      // Get all users
      const users = await client.getAllUsers();
      console.log('Users:', users);
  
      // Get sales data
      const sales = await client.getSales();
      console.log('Sales:', sales);
  
      // Check inventory
      const inventory = await client.getInventory();
      console.log('Inventory:', inventory);
  
      // Update inventory
      const updatedInventory = await client.updateInventory(1, 1, 10);
      console.log('Updated Inventory:', updatedInventory);
  
      // Create a fulfillment
      const fulfillment = await client.createFulfillment('ORD-2024-009', 1, [
        { product_id: 1, quantity: 1 },
        { product_id: 2, quantity: 2 }
      ]);
      console.log('Created Fulfillment:', fulfillment);
  
      // Check fulfillment status
      const status = await client.getFulfillmentStatus(fulfillment.id);
      console.log('Fulfillment Status:', status);
  
    } catch (error) {
      console.error('Error:', error.message);
    }
  };
  
  // Test with fake data
  const testClient = async () => {
    const client = new EcommerceClient({
      baseURL: 'https://fake-api.example.com'
    });
  
    // Mock response for testing
    globalThis.fetch = async (url, options) => {
      const mockData = {
        data: {
          id: 1,
          status: 'success',
          timestamp: new Date().toISOString()
        }
      };
  
      return {
        ok: true,
        json: async () => mockData
      };
    };
  
    try {
      const result = await client.getSales();
      console.log('Test result:', result);
    } catch (error) {
      console.error('Test error:', error);
    }
  };
  
  module.exports = EcommerceClient;