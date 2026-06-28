import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';

const isVercel = typeof process !== 'undefined' && process.env && process.env.VERCEL;
const url = env.TURSO_CONNECTION_URL || (isVercel ? 'file:/tmp/local.db' : 'file:local.db');
const authToken = env.TURSO_AUTH_TOKEN || '';

export const db = createClient({
	url,
	authToken
});
