import type { Plugin } from 'vite';
import { toNodeHandler } from 'better-auth/node';
import { auth, ensureAuthDatabase } from './auth';

export function betterAuthPlugin(): Plugin {
  return {
    name: 'vite-plugin-better-auth',
    async configureServer(server) {
      await ensureAuthDatabase();
      const nodeHandler = toNodeHandler(auth);
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api/auth')) {
          return nodeHandler(req, res);
        }
        next();
      });
    },
    async configurePreviewServer(server) {
      await ensureAuthDatabase();
      const nodeHandler = toNodeHandler(auth);
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api/auth')) {
          return nodeHandler(req, res);
        }
        next();
      });
    }
  };
}
