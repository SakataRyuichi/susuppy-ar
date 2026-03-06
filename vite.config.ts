/// <reference types="vitest" />
import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * mkcert で生成した証明書ファイルが存在する場合だけ HTTPS を有効にする。
 * ファイルがない場合は http で起動し、CI や通常開発には影響を与えない。
 */
function resolveHttpsOptions(): { key: Buffer; cert: Buffer } | undefined {
  const keyPath = path.resolve("192.168.11.18+2-key.pem");
  const certPath = path.resolve("192.168.11.18+2.pem");
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }
  return undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    https: resolveHttpsOptions(),
    allowedHosts: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
  },
});
