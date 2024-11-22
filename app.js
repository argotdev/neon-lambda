import EcommerceClient from './EcommerceClient.js';

const client = new EcommerceClient({
  baseURL: 'https://q25v3hkkfk.execute-api.us-east-1.amazonaws.com',
  timeout: 5000,
  
});

// Example call
const inventory = await client.getInventory();
console.log(inventory);