import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendEnvPath = path.resolve(currentDir, "../../.env");
const rootEnvPath = path.resolve(currentDir, "../../../../.env");

dotenv.config({ path: backendEnvPath });
dotenv.config({ path: rootEnvPath });
