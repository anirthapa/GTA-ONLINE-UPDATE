import 'server-only';
import { createHmac } from 'node:crypto';
import { getDb,isDatabaseConfigured } from '@/lib/db';
import type { NextRequest } from 'next/server';
export function requestIdentifier(request:NextRequest){const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')||'unknown':request.headers.get('x-forwarded-for')?.split(',')[0]||'local';const secret=process.env.CRON_SECRET;if(!secret||secret.length<32)throw new Error('Abuse prevention secret is not configured.');return createHmac('sha256',secret).update(`${new Date().toISOString().slice(0,10)}:${ip}`).digest('hex');}
export async function rateLimit(request:NextRequest,scope:string,limit:number,seconds:number){if(!isDatabaseConfigured())return process.env.NODE_ENV==='development'||process.env.DEMO_MODE==='true';const {data,error}=await getDb().rpc('consume_rate_limit',{p_key:`${scope}:${requestIdentifier(request)}`,p_limit:limit,p_seconds:seconds});if(error)throw error;return data===true;}
