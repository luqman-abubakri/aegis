import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/lib/models/User";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing environment variable: JWT_SECRET");
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    // Read login data
    const body = await request.json();

    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter your email and password",
        },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await dbConnect();

    // Normalize email
    const normalizedEmail = String(email).trim().toLowerCase();

    // Find user
    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Don't reveal whether the email exists
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Compare password with stored bcrypt hash
    const passwordIsValid = await bcrypt.compare(
      String(password),
      user.password
    );

    if (!passwordIsValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Create JWT
    const token = await new SignJWT({
      userId: user._id.toString(),
      email: user.email,
      name: user.fullName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    // Create secure HTTP-only cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "Signed in successfully",
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.fullName,
          avatarUrl: user.avatarUrl || "",
        },
      },
      { status: 200 }
    );

    response.cookies.set({
      name: "aegis_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Sign-in error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while signing in",
      },
      { status: 500 }
    );
  }
}