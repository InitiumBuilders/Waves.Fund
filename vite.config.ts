import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ command, mode }) => ({
  define: { 'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(loadEnv(mode, process.cwd(), '').VITE_CLERK_PUBLISHABLE_KEY || loadEnv(mode, process.cwd(), '').NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '') },
  plugins: [
    react(),
    ...(command === "serve"
      ? [
          {
            name: "local-community-api",
            async configureServer(server: any) {
              Object.assign(
                process.env,
                loadEnv("development", process.cwd(), ""),
              );
              const handlers = { community: (await import("./api/community.js")).default, trax: (await import("./api/trax.js")).default, workspace: (await import("./api/workspace.js")).default, waves: (await import("./api/waves.js")).default, volunteer: (await import("./api/volunteer.js")).default };
              for (const [name, handler] of Object.entries(handlers)) {
              server.middlewares.use(
                `/api/${name}`,
                async (req: any, res: any) => {
                  let raw = "";
                  for await (const chunk of req) {
                    raw += chunk;
                    if (raw.length > (name === 'workspace' ? 100000 : 20000)) {
                      res.statusCode = 413;
                      res.end(JSON.stringify({ error: "Request too large." }));
                      return;
                    }
                  }
                  req.query = Object.fromEntries(
                    new URL(req.url, "http://localhost").searchParams,
                  );
                  try {
                    req.body = raw ? JSON.parse(raw) : {};
                  } catch {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: "Invalid JSON." }));
                    return;
                  }
                  res.status = (code: number) => {
                    res.statusCode = code;
                    return res;
                  };
                  res.json = (body: unknown) => {
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(body));
                    return res;
                  };
                  await handler(req, res);
                },
              );
              }
            },
          },
        ]
      : []),
  ],
  build: { assetsInlineLimit: 0 },
}));

