import serverless from "serverless-http";
import { createExpressApp } from "../../server.js";

let serverlessApp: any;

export const handler = async (event: any, context: any) => {
  if (!serverlessApp) {
    const app = await createExpressApp();
    serverlessApp = serverless(app);
  }
  return serverlessApp(event, context);
};
