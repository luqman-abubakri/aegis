import { verifyToken } from "@/lib/jwt";
import { GraphQlContext } from "@/types";

export async function createContext(req: Request): Promise<GraphQlContext> {
  const context: GraphQlContext = {};

  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = verifyToken(token);
      if (decoded) {
        context.userId = decoded.userId;
        context.email = decoded.email;
      }
    }
  } catch {
    // If token verification fails, just return empty context
  }

  return context;
}

