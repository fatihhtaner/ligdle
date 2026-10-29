import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./": the build works from any sub-path (GitHub Pages /ligdle/) or straight from disk.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
