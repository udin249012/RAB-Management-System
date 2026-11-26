import "./config/loadEnv.js";
import { createApp } from "./app.js";
import { loadEnvironment } from "./config/environment.js";

const env = loadEnvironment();
const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[rab-backend] Running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
