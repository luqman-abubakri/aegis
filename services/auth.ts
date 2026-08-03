import { supabase } from "@/lib/supabase";

export interface AuthResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    console.log("✓ Auth signup initiated for:", email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      console.error("❌ Auth signup failed:", error);
      return {
        success: false,
        message: error.message,
      };
    }

    if (!data.user) {
      console.error("❌ Auth signup succeeded but no user returned");
      return {
        success: false,
        message: "Failed to create account. Please try again.",
      };
    }

    console.log("✓ Auth signup succeeded");
    console.log("✓ User ID received:", data.user.id);
    console.log("✓ Profile will be created automatically by database trigger");

    return {
      success: true,
      message:
        "Account created successfully! Check your email for confirmation.",
      user: {
        id: data.user.id,
        email: data.user.email ?? email,
        name,
      },
    };
  } catch (err: unknown) {
    console.error("❌ Unexpected signup error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return {
      success: false,
      message,
    };
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Map Supabase error messages to user-friendly messages
      const message = mapAuthError(error.message);
      return {
        success: false,
        message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    return {
      success: true,
      message: "Signed in successfully!",
      user: {
        id: data.user.id,
        email: data.user.email ?? email,
        name: data.user.user_metadata?.full_name ?? "User",
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return {
      success: false,
      message,
    };
  }
}

export async function signOut(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: true,
      message: "Signed out successfully.",
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return {
      success: false,
      message,
    };
  }
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }

  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  if (lower.includes("user not found")) {
    return "No account found with this email address.";
  }

  if (lower.includes("rate limit")) {
    return "Too many attempts. Please try again later.";
  }

  if (lower.includes("network")) {
    return "Network error. Please check your connection.";
  }

  return message;
}

