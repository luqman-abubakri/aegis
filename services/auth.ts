export interface AuthResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
  };
}

/**
 * Create a new account through the MongoDB API.
 */
export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    console.log("✓ MongoDB signup initiated for:", email);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error("❌ Signup failed:", data.message);

      return {
        success: false,
        message: data.message || "Failed to create account.",
      };
    }

    console.log("✓ MongoDB signup succeeded");
    console.log("✓ User ID:", data.user?.id);

    return {
      success: true,
      message: data.message || "Account created successfully.",
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name ?? data.user.fullName ?? name,
            avatarUrl: data.user.avatarUrl ?? "",
          }
        : undefined,
    };
  } catch (error) {
    console.error("❌ Signup request failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create account. Please try again.",
    };
  }
}

/**
 * Sign in through the MongoDB/JWT API.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    console.log("✓ MongoDB sign-in initiated for:", email);

    const response = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error("❌ Sign-in failed:", data.message);

      return {
        success: false,
        message: data.message || "Invalid email or password.",
      };
    }

    console.log("✓ MongoDB sign-in succeeded");
    console.log("✓ User ID:", data.user?.id);

    return {
      success: true,
      message: data.message || "Signed in successfully.",
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name ?? data.user.fullName ?? "User",
            avatarUrl: data.user.avatarUrl ?? "",
          }
        : undefined,
    };
  } catch (error) {
    console.error("❌ Sign-in request failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
    };
  }
}

/**
 * Sign out by clearing the MongoDB/JWT session cookie.
 */
export async function signOut(): Promise<AuthResult> {
  try {
    console.log("✓ Signing out...");

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || "Failed to sign out.",
      };
    }

    console.log("✓ Signed out successfully");

    return {
      success: true,
      message: data.message || "Signed out successfully.",
    };
  } catch (error) {
    console.error("❌ Sign-out request failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to sign out. Please try again.",
    };
  }
}