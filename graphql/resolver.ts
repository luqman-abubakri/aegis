import { GraphQlContext, AuthResponse } from "@/types";
import { generateToken } from "@/lib/jwt";
import { validatePassword, validateEmail, validateName } from "@/utils/password";
import User from "@/models/User";

interface RegisterArgs {
  input: {
    name: string;
    email: string;
    password: string;
  };
}

interface LoginArgs {
  input: {
    email: string;
    password: string;
  };
}

export const resolvers = {
  Query: {
    currentUser: async (
      _: unknown,
      __: unknown,
      context: GraphQlContext
    ): Promise<AuthResponse["user"] | null> => {
      if (!context.userId) {
        throw new Error("Not authenticated");
      }

      const user = await User.findById(context.userId);
      if (!user) {
        throw new Error("User not found");
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
  },

  Mutation: {
    register: async (
      _: unknown,
      { input }: RegisterArgs
    ): Promise<AuthResponse> => {
      // Validate name
      const nameError = validateName(input.name);
      if (nameError) {
        return {
          success: false,
          message: nameError,
        };
      }

      // Validate email
      if (!validateEmail(input.email)) {
        return {
          success: false,
          message: "Please provide a valid email address",
        };
      }

      // Validate password
      const passwordValidation = validatePassword(input.password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: passwordValidation.errors[0],
        };
      }

      // Check duplicate email
      const existingUser = await User.findOne({ email: input.email.toLowerCase() });
      if (existingUser) {
        return {
          success: false,
          message: "An account with this email already exists",
        };
      }

      // Create user
      try {
        const user = await User.create({
          name: input.name.trim(),
          email: input.email.toLowerCase().trim(),
          password: input.password,
        });

        const token = generateToken({
          userId: user._id.toString(),
          email: user.email,
        });

        return {
          success: true,
          message: "Account created successfully",
          token,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
        };
      } catch (error: any) {
        return {
          success: false,
          message: error.message || "Failed to create account",
        };
      }
    },

    login: async (
      _: unknown,
      { input }: LoginArgs
    ): Promise<AuthResponse> => {
      // Validate inputs
      if (!input.email || !input.password) {
        return {
          success: false,
          message: "Email and password are required",
        };
      }

      // Find user
      const user = await User.findOne({ email: input.email.toLowerCase() }).select("+password");
      if (!user) {
        return {
          success: false,
          message: "Invalid email or password",
        };
      }

      // Compare password
      const isMatch = await user.comparePassword(input.password);
      if (!isMatch) {
        return {
          success: false,
          message: "Invalid email or password",
        };
      }

      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
      });

      return {
        success: true,
        message: "Signed in successfully",
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    },
  },
};

