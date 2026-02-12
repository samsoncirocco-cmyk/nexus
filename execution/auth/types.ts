import { NextRequest } from "next/server";

export interface NexusSession {
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  };
  expires: string;
}

export interface OAuthState {
  state: string;
  codeVerifier?: string; // For PKCE
  platform: string;
  userId: string;
  redirectUrl: string;
  createdAt: number;
}

export type CacheStore = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds: number) => Promise<void>;
  del: (key: string) => Promise<void>;
};
