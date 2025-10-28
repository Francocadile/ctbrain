import NextAuth, { type NextAuthOptions } from 'next-auth'
import type { AppRole } from '../types/next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })
        if (!user || !user.password) return null
        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null
        // Devuelve solo los campos esperados por NextAuth, con role tipado correctamente y sin password
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as AppRole,
          approved: user.approved,
          teamId: user.teamId ?? null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user }) {
      // SUPERADMIN siempre entra
      // @ts-ignore
      if ((user as any)?.role === 'SUPERADMIN') return true
      // @ts-ignore
      const approved = !!(user as any)?.approved
      if (!approved) return '/pending-approval'
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        // @ts-ignore
        token.id = (user as any).id
        // @ts-ignore
        token.role = (user as any).role
        // @ts-ignore
        token.teamId = (user as any).teamId
        // @ts-ignore
        token.approved = !!(user as any).approved
      }
      return token
    },
    async session({ session, token }) {
      // @ts-ignore
      session.user.id = token.id as string
      // @ts-ignore
      session.user.role = token.role as string
      // @ts-ignore
      session.user.teamId = (token as any).teamId as string
      // @ts-ignore
      session.user.approved = !!(token as any).approved
      return session
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
