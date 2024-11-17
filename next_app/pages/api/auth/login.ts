import NextAuth, { DefaultSession, NextAuthOptions, Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Adapter, AdapterSession, AdapterUser } from "next-auth/adapters";
import { Pool } from "pg";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"]
  }
}

// カスタムセッション型の定義
interface CustomSession extends Session {
  user: {
    id: string;
    name: string;
    email: string;
  } & DefaultSession["user"];
}

// データベースのセッション型の定義
interface DatabaseSession {
  id: number;
  user_id: string;
  session_key: string;
  expires: Date;
  created_at: Date;
  updated_at: Date;
}

// ユーザー型の定義
interface DatabaseUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_NAME,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

// PostgreSQLアダプターの定義
const PostgresAdapter = {
  // セッション関連のメソッド
  async createSession(session: { sessionToken: string; userId: string; expires: Date }): Promise<AdapterSession> {
    const result = await pool.query<DatabaseSession>(
      'INSERT INTO sessions (user_id, session_key, expires) VALUES ($1, $2, $3) RETURNING *',
      [session.userId, session.sessionToken, session.expires]
    );

    const dbSession = result.rows[0];
    return {
      sessionToken: dbSession.session_key,
      userId: dbSession.user_id,
      expires: dbSession.expires,
    };
  },

  async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
    const result = await pool.query<DatabaseSession & DatabaseUser>(
      'SELECT s.*, u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_key = $1 AND s.expires > NOW()',
      [sessionToken]
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      session: {
        sessionToken: row.session_key,
        userId: row.user_id,
        expires: row.expires,
      },
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        emailVerified: null,
      },
    };
  },

  async updateSession(
    session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
  ): Promise<AdapterSession | null> {
    const result = await pool.query<DatabaseSession>(
      'UPDATE sessions SET expires = $1 WHERE session_key = $2 RETURNING *',
      [session.expires, session.sessionToken]
    );

    const updatedSession = result.rows[0];
    if (!updatedSession) return null;

    return {
      sessionToken: updatedSession.session_key,
      userId: updatedSession.user_id,
      expires: updatedSession.expires,
    };
  },

  async deleteSession(sessionToken: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE session_key = $1', [sessionToken]);
  },

  // ユーザー関連のメソッド（必須）
  async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
    throw new Error("createUser not implemented");
  },

  async getUser(id: string): Promise<AdapterUser | null> {
    throw new Error("getUser not implemented");
  },

  async getUserByEmail(email: string): Promise<AdapterUser | null> {
    throw new Error("getUserByEmail not implemented");
  },

  async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }): Promise<AdapterUser | null> {
    throw new Error("getUserByAccount not implemented");
  },

  async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">): Promise<AdapterUser> {
    throw new Error("updateUser not implemented");
  },

  async deleteUser(userId: string): Promise<void> {
    throw new Error("deleteUser not implemented");
  },

  // アカウント関連のメソッド（必須）
  async linkAccount(account: any): Promise<void> {
    throw new Error("linkAccount not implemented");
  },

  async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }): Promise<void> {
    throw new Error("unlinkAccount not implemented");
  },

  // 検証トークン関連のメソッド（必須）
  async createVerificationToken({ identifier, expires, token }: { identifier: string; expires: Date; token: string }): Promise<{ identifier: string; expires: Date; token: string; } | null> {
    throw new Error("createVerificationToken not implemented");
  },

  async useVerificationToken({ identifier, token }: { identifier: string; token: string }): Promise<{ identifier: string; expires: Date; token: string; } | null> {
    throw new Error("useVerificationToken not implemented");
  },
} satisfies Adapter;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "user" },
        password: { label: "Password", type: "password" },
      },
      async authorize(
        credentials: Record<"username" | "password", string> | undefined
      ): Promise<User | null> {
        if (!credentials) {
          return null;
        }
      
        const users: DatabaseUser[] = [
          {
            id: "1",
            name: "John", 
            email: "john@example.com",
            password: "password123",
          },
        ];
      
        // emailとパスワードで検索するように修正
        const user = users.find(
          (u) =>
            u.email === credentials.username && u.password === credentials.password
        );
      
        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
          };

        }
        return null;
      },
    }),
  ],
  adapter: PostgresAdapter,
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async session({ session, user }): Promise<CustomSession> {
      if (session?.user) {
        session.user.id = user.id;
      }
      return session as CustomSession;
    },
  },
};

export default NextAuth(authOptions);