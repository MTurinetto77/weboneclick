import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: number;
    role?: string;
  }
}

export function isDevAuthBypassEnabled() {
  return (
    process.env.AUTH_DEV_BYPASS === "true" && process.env.NODE_ENV !== "production"
  );
}

export function isGoogleAuthConfigured() {
  return (
    !!process.env.AUTH_GOOGLE_ID &&
    !!process.env.AUTH_GOOGLE_SECRET &&
    process.env.AUTH_GOOGLE_ID !== "replace-me"
  );
}

async function findActiveAdmin(email?: string | null) {
  if (email) {
    const byEmail = await prisma.usuario.findFirst({
      where: {
        mail: email,
        activo: true,
        tipo_usuario: "admin",
      },
    });
    if (byEmail) return byEmail;
  }

  const seedEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (seedEmail) {
    const bySeed = await prisma.usuario.findFirst({
      where: {
        mail: seedEmail,
        activo: true,
        tipo_usuario: "admin",
      },
    });
    if (bySeed) return bySeed;
  }

  return prisma.usuario.findFirst({
    where: { activo: true, tipo_usuario: "admin" },
    orderBy: { id_usuario: "asc" },
  });
}

function splitDisplayName(name?: string | null): { nombre: string; apellido: string } {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nombre: "Cliente", apellido: "Google" };
  if (parts.length === 1) return { nombre: parts[0], apellido: "-" };
  return { nombre: parts[0], apellido: parts.slice(1).join(" ") };
}

/** Asegura usuario (+ cliente si es nuevo) para login Google del shop. */
async function ensureGoogleShopUser(email: string, displayName?: string | null) {
  const mail = email.toLowerCase();
  try {
    let usuario = await prisma.usuario.findFirst({ where: { mail } });
    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          mail,
          tipo_usuario: "cliente",
          activo: true,
        },
      });
    }

    let cliente = await prisma.cliente.findUnique({ where: { mail } });
    if (!cliente) {
      const { nombre, apellido } = splitDisplayName(displayName);
      cliente = await prisma.cliente.create({
        data: {
          id_usuario: usuario.id_usuario,
          nombre,
          apellido,
          mail,
        },
      });
    } else if (!cliente.id_usuario) {
      await prisma.cliente.update({
        where: { id_cliente: cliente.id_cliente },
        data: { id_usuario: usuario.id_usuario },
      });
    }

    return usuario;
  } catch (err) {
    console.error("[auth] ensureGoogleShopUser failed", { mail, err });
    throw err;
  }
}

const providers = [];

if (isGoogleAuthConfigured()) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    })
  );
}

if (isDevAuthBypassEnabled()) {
  providers.push(
    Credentials({
      id: "dev-bypass",
      name: "Dev bypass",
      credentials: {},
      async authorize() {
        const admin = await findActiveAdmin(process.env.SEED_ADMIN_EMAIL);
        if (!admin) return null;
        return {
          id: String(admin.id_usuario),
          email: admin.mail,
          name: admin.mail,
        };
      },
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/cuenta",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "dev-bypass" && isDevAuthBypassEnabled()) {
        return !!user.email;
      }
      // Google: permitido para admin y clientes del shop (el proxy /admin exige rol admin).
      if (account?.provider === "google") {
        return !!user.email;
      }
      return false;
    },
    async jwt({ token, user, account }) {
      const email = (user?.email ?? token.email)?.toLowerCase();
      if (!email) return token;

      if (account?.provider === "google" && user) {
        const dbUser = await ensureGoogleShopUser(email, user.name);
        token.userId = dbUser.id_usuario;
        token.role = dbUser.tipo_usuario;
        token.email = dbUser.mail;
        token.name = user.name ?? dbUser.mail;
        return token;
      }

      // Sesión ya hidratada (p. ej. middleware): no pegarle a la DB en cada request.
      if (token.userId && token.role) {
        return token;
      }

      try {
        const dbUser = await prisma.usuario.findFirst({ where: { mail: email } });
        if (dbUser) {
          token.userId = dbUser.id_usuario;
          token.role = dbUser.tipo_usuario;
          token.email = dbUser.mail;
          token.name = token.name ?? dbUser.mail;
        }
      } catch (err) {
        console.error("[auth] jwt user lookup failed", { email, err });
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: (token.userId as number) ?? 0,
          role: (token.role as string) ?? "",
          email: (token.email as string) ?? session.user?.email,
          name: (token.name as string) ?? session.user?.name,
        },
      };
    },
  },
  session: { strategy: "jwt" },
  trustHost: true,
});
