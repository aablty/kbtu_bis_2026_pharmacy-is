import { defineConfig } from "orval";

// Run with the backend running locally (`uv run uvicorn src.main:app` in
// server/, default http://localhost:8000) - codegen reads its live
// /openapi.json, there's no committed schema file to point at instead.
export default defineConfig({
  pillpoint: {
    input: "http://localhost:8000/openapi.json",
    output: {
      target: "./src/shared/api/generated.ts",
      client: "react-query",
      httpClient: "axios",
      baseUrl: "http://localhost:8000",
      override: {
        mutator: {
          path: "./src/shared/api/client.ts",
          name: "apiMutator",
        },
      },
    },
  },
});
