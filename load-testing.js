const EcommerceClient = require('./EcommerceClient');

// Utility to add random delay
const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Simulate a single user's behavior
class VirtualUser {
  constructor(userId, baseURL) {
    this.userId = userId;
    this.client = new EcommerceClient({
      baseURL,
      headers: {
        'User-Agent': `Virtual-User-${userId}`,
        'X-Test-User-Id': userId.toString()
      }
    });
  }

  async randomAction() {
    // List of possible actions with their relative weights
    const actions = [
      { weight: 40, action: () => this.client.getInventory() },             // Most common
      { weight: 30, action: () => this.client.getSales() },                 // Very common
      { weight: 15, action: () => this.client.getFulfillmentStatus(1) },    // Less common
      { weight: 10, action: () => this.client.getAllUsers() },              // Occasional
      { weight: 5, action: () => this.createRandomFulfillment() }           // Rare
    ];

    // Choose random action based on weights
    const totalWeight = actions.reduce((sum, action) => sum + action.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { weight, action } of actions) {
      if (random < weight) return action();
      random -= weight;
    }
  }

  async createRandomFulfillment() {
    const orderId = `ORD-${Date.now()}-${this.userId}`;
    const warehouseId = Math.floor(Math.random() * 3) + 1;
    const items = [
      {
        product_id: Math.floor(Math.random() * 5) + 1,
        quantity: Math.floor(Math.random() * 3) + 1
      }
    ];
    
    return this.client.createFulfillment(orderId, warehouseId, items);
  }

  async simulateUserSession(duration = 60000) {
    const startTime = Date.now();
    const results = [];

    while (Date.now() - startTime < duration) {
      try {
        const startActionTime = Date.now();
        const result = await this.randomAction();
        const endActionTime = Date.now();

        results.push({
          userId: this.userId,
          success: true,
          responseTime: endActionTime - startActionTime
        });

        // Random delay between actions (0.5 to 3 seconds)
        await randomDelay(500, 3000);
      } catch (error) {
        results.push({
          userId: this.userId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

// Load test orchestrator
class LoadTest {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://your-api-endpoint.amazonaws.com';
    this.numUsers = config.numUsers || 10;
    this.testDuration = config.testDuration || 60000; // 1 minute default
    this.results = [];
  }

  async run() {
    console.log(`Starting load test with ${this.numUsers} users for ${this.testDuration/1000} seconds`);
    const startTime = Date.now();

    // Create and start all virtual users
    const users = Array.from({ length: this.numUsers }, 
      (_, i) => new VirtualUser(i + 1, this.baseURL)
    );

    const userSessions = users.map(user => 
      user.simulateUserSession(this.testDuration)
    );

    // Wait for all user sessions to complete
    const allResults = await Promise.all(userSessions);
    this.results = allResults.flat();

    // Calculate statistics
    this.printStatistics();
  }

  printStatistics() {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const responseTimes = this.results
      .filter(r => r.success)
      .map(r => r.responseTime);

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    console.log('\nLoad Test Results:');
    console.log('==================');
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Successful Requests: ${successfulRequests}`);
    console.log(`Failed Requests: ${failedRequests}`);
    console.log(`Success Rate: ${((successfulRequests/totalRequests) * 100).toFixed(2)}%`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    
    // Print error distribution if any failures
    if (failedRequests > 0) {
      const errorCounts = this.results
        .filter(r => !r.success)
        .reduce((acc, curr) => {
          acc[curr.error] = (acc[curr.error] || 0) + 1;
          return acc;
        }, {});

      console.log('\nError Distribution:');
      Object.entries(errorCounts).forEach(([error, count]) => {
        console.log(`${error}: ${count} occurrences`);
      });
    }
  }
}

// Example usage
const runLoadTest = async () => {
  const loadTest = new LoadTest({
    baseURL: 'https://q25v3hkkfk.execute-api.us-east-1.amazonaws.com',
    numUsers: 50,        // 50 concurrent users
    testDuration: 300000 // 5 minutes
  });

  await loadTest.run();
};

// Run the test
runLoadTest().catch(console.error);