// Import necessary tools from AWS Amplify to define data structures
import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

// Define the GraphQL schema
const schema = a.schema({
  
  // Structures what data comes back from Lambda function
  BedrockResponse: a.customType({
    body: a.string(),
    error: a.string(),
  }),

  // Model for storing saved travel itineraries
  Itinerary: a
    .model({
      name: a.string().required(),
      destination: a.string().required(),
      days: a.integer().required(),
      interests: a.string().array().required(),
      generatedItinerary: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),

  // Define the main query that frontend will call
  askBedrock: a
    .query()
    
    // Define what inputs this query needs from the frontend
    .arguments({ 
      destination: a.string(),           
      days: a.integer(),                 
      interests: a.string().array()      
    })
    
    // Define what this query returns
    .returns(a.ref("BedrockResponse"))
    
    // Only authenticated users can call this query
    .authorization((allow) => [allow.authenticated()])
    
    // Tell AppSync how to process this query
    .handler(
      a.handler.custom({
        entry: "./bedrock.js",       // Use the Lambda function
        dataSource: "bedrockDS"      // Connect to Bedrock data source from backend.ts
      })
    ),
});

// Export the schema type so TypeScript knows the structure in the frontend
export type Schema = ClientSchema<typeof schema>;

// Configure and export the actual data resource
export const data = defineData({
  schema,  // Use the schema defined above
  
  // Set up how users authenticate
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",     
    apiKeyAuthorizationMode: {
      expiresInDays: 30,                    
    },
  },
});