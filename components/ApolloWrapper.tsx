"use client";

import client from "@/graphql/apollo-client";

interface ApolloWrapperProps {
  children: React.ReactNode;
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  // Apollo Client is initialized but auth uses direct fetch calls
  // This wrapper is kept for future GraphQL query component usage
  return <>{children}</>;
}

