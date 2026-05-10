import serverless from "serverless-http";
import { createExpressApp } from "../../server";

let serverlessApp: any;

export const handler = async (event: any, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  if (!serverlessApp) {
    try {
      const app = await createExpressApp();
      serverlessApp = serverless(app);
    } catch (error) {
      console.error("Failed to initialize Express app for Netlify Function:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error during initialization" })
      };
    }
  }
  
  return serverlessApp(event, context);
};
