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
    // Check for context-level errors
    if (ctx.error) {
      return {
        body: null,
        error: `Request failed: ${ctx.error.message || 'Unknown error'}`,
      };
    }

    // Validate response exists
    if (!ctx.result) {
      return {
        body: null,
        error: 'No response received from Bedrock service',
      };
    }

    // Check HTTP status code
    const statusCode = ctx.result.statusCode;
    if (statusCode && (statusCode < 200 || statusCode >= 300)) {
      return {
        body: null,
        error: `Bedrock service returned error status: ${statusCode}`,
      };
    }

    // Check for AWS error headers
    const errorType = ctx.result.headers && ctx.result.headers['x-amzn-ErrorType'];
    if (errorType) {
      if (errorType.indexOf('AccessDeniedException') === 0) {
        return {
          body: null,
          error: 'The AI model is not available. Please contact support.',
        };
      }
      if (errorType.indexOf('ThrottlingException') === 0) {
        return {
          body: null,
          error: 'Too many requests. Please try again in a moment.',
        };
      }
      if (errorType.indexOf('ValidationException') === 0) {
        return {
          body: null,
          error: 'Invalid request parameters. Please check your input.',
        };
      }
      return {
        body: null,
        error: `Service error: ${errorType}`,
      };
    }

    // Safely parse response body (JSON.parse returns empty string on invalid JSON in AppSync)
    if (!ctx.result.body) {
      return {
        body: null,
        error: 'Empty response received from Bedrock service',
      };
    }
    const parsedBody = JSON.parse(ctx.result.body);
    if (!parsedBody) {
      return {
        body: null,
        error: 'Failed to parse Bedrock response. Please try again.',
      };
    }

    // Validate response structure
    if (!parsedBody.content) {
      const errorMessage = parsedBody.error || parsedBody.message || 'Invalid response structure';
      return {
        body: null,
        error: `Bedrock error: ${errorMessage}`,
      };
    }

    if (!parsedBody.content || typeof parsedBody.content !== 'object' || typeof parsedBody.content.length !== 'number' || parsedBody.content.length === 0) {
      return {
        body: null,
        error: 'Bedrock returned empty content. Please try again.',
      };
    }

    const firstContent = parsedBody.content[0];
    if (!firstContent || typeof firstContent.text !== 'string') {
      return {
        body: null,
        error: 'Bedrock response missing text content. Please try again.',
      };
    }

    const text = firstContent.text.trim();
    if (text.length === 0) {
      return {
        body: null,
        error: 'Bedrock returned empty itinerary. Please try again with different parameters.',
      };
    }

    // Success
    return {
      body: text,
      error: null,
    };
  }