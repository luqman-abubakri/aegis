import NextAuth from "next-auth";
import Google, { type GoogleProfile } from "next-auth/providers/google";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/lib/models/User";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/sign-in",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (!account || account.provider !== "google") {
        return token;
      }

      const googleProfile = profile as GoogleProfile | undefined;
      const email =
        typeof googleProfile?.email === "string"
          ? googleProfile.email.trim().toLowerCase()
          : "";

      if (googleProfile?.email_verified !== true || !email) {
        throw new Error("Google sign-in requires a verified email address.");
      }

      const googleId = account.providerAccountId;

      if (!googleId) {
        throw new Error("Google did not provide an account identifier.");
      }

      const image =
        typeof googleProfile.picture === "string"
          ? googleProfile.picture
          : "";

      await dbConnect();

      let user = await User.findOne({ googleId });

      if (!user) {
        user = await User.findOne({ email });

        if (user) {
          if (user.googleId && user.googleId !== googleId) {
            throw new Error(
              "This email is already linked to a different Google account."
            );
          }

          user.googleId = googleId;
          user.password = null;

          if (!user.avatarUrl && image) {
            user.avatarUrl = image;
          }

          await user.save();
        } else {
          user = await User.create({
            email,
            fullName:
              typeof googleProfile.name === "string" &&
              googleProfile.name.trim()
                ? googleProfile.name.trim()
                : email,
            password: null,
            avatarUrl: image,
            googleId,
          });
        }
      } else if (!user.avatarUrl && image) {
        user.avatarUrl = image;
        await user.save();
      }

      const userId = user._id.toString();
      token.userId = userId;
      token.authTime = Math.floor(Date.now() / 1000);
      token.sub = userId;
      token.email = user.email;
      token.name = user.fullName;
      token.picture = user.avatarUrl || null;

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }

      if (typeof token.authTime === "number") {
        session.authTime = token.authTime;
      }

      return session;
    },
  },
});
