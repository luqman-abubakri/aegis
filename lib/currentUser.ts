import { auth } from "@/auth";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const legacyToken = cookieStore.get("aegis_session")?.value;
  let legacyUserId: string | null = null;
  let legacyIssuedAt = 0;

  if (legacyToken) {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("Missing environment variable: JWT_SECRET");
    }

    try {
      const { payload } = await jwtVerify(
        legacyToken,
        new TextEncoder().encode(jwtSecret)
      );

      if (typeof payload.userId === "string") {
        legacyUserId = payload.userId;
        legacyIssuedAt =
          typeof payload.iat === "number" ? payload.iat : 0;
      }
    } catch {
      // An invalid legacy cookie may coexist with a valid Auth.js session.
    }
  }

  const session = await auth();
  const authUserId =
    typeof session?.user?.id === "string" ? session.user.id : null;

  if (
    authUserId &&
    (typeof session?.authTime !== "number" ||
      session.authTime >= legacyIssuedAt)
  ) {
    return authUserId;
  }

  return legacyUserId;
}
