// Defines a request function that constructs the HTTP request to invoke the Claude 3 Haiku foundation model in Amazon Bedrock.
export function request(ctx) {
    const { destination = "", days = 1, interests = [] } = ctx.args;
  
    // Construct the prompt for travel itinerary
    const prompt = `Create a ${days}-day travel itinerary for ${destination}. Focus on these interests: ${interests.join(", ")}. For each day, provide 3-4 activities with brief descriptions and suggested timing.`;
  
    // Return the request configuration
    return {
      resourcePath: `/model/anthropic.claude-3-haiku-20240307-v1:0/invoke`,
      method: "POST",
      params: {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
        }),
      },
    };
  }
  
  // The response function parses the response and returns the generated itinerary
  export function response(ctx) {
    // Parse the response body
    const parsedBody = JSON.parse(ctx.result.body);
    // Extract the text content from the response
    const res = {
      body: parsedBody.content[0].text,
    };
    // Return the response
    return res;
  }