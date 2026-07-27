import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/dbConnect";
import { typeDefs } from "@/graphql/schema";
import { resolvers } from "@/graphql/resolver";
import { createContext } from "@/graphql/contex";

// Minimal GraphQL executor using native HTTP
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { query, variables } = body;

    if (!query) {
      return NextResponse.json(
        { errors: [{ message: "No query provided" }] },
        { status: 400 }
      );
    }

    const context = await createContext(req);
    const result = await executeGraphQL({ query, variables, context });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { errors: [{ message: error.message || "Internal server error" }] },
      { status: 500 }
    );
  }
}

interface ExecuteArgs {
  query: string;
  variables?: Record<string, unknown>;
  context: any;
}

// Simple GraphQL executor for schema-first approach
async function executeGraphQL({ query, variables, context }: ExecuteArgs) {
  // Parse the operation
  const isMutation = query.includes("mutation");
  const operationType = isMutation ? "Mutation" : "Query";

  // Extract operation name
  const operationMatch = query.match(/(mutation|query)\s+(\w+)/);
  const operationName = operationMatch ? operationMatch[2] : "";

  try {
    let result: any;

    if (operationType === "Mutation") {
      const mutationMap: Record<string, Function> = {
        register: resolvers.Mutation.register,
        login: resolvers.Mutation.login,
      };

      const resolver = mutationMap[operationName];
      if (!resolver) {
        return { errors: [{ message: `Unknown mutation: ${operationName}` }] };
      }

      result = await resolver(null, { input: variables?.input || {} }, context);
    } else {
      const queryMap: Record<string, Function> = {
        currentUser: resolvers.Query.currentUser,
      };

      const resolver = queryMap[operationName];
      if (!resolver) {
        return { errors: [{ message: `Unknown query: ${operationName}` }] };
      }

      result = await resolver(null, {}, context);
    }

    return { data: { [operationName]: result } };
  } catch (error: any) {
    return {
      errors: [{ message: error.message || "Operation failed" }],
    };
  }
}

