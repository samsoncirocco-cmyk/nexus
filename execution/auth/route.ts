
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend" 
import { SupabaseAdapter } from "@auth/supabase-adapter"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV === "development",
  theme: { logo: "https://authjs.dev/img/logo-sm.png" },
  adapter: SupabaseAdapter({
    url: SUPABASE_URL,
    secret: SUPABASE_SECRET,
  }),
  providers: [
    Google,
    Resend({
      from: "onboarding@resend.dev",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/error",
  }
})
