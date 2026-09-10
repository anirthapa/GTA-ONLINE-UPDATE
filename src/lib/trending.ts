import 'server-only';
import { getDb,isDatabaseConfigured } from '@/lib/db';
import { getArticles } from '@/services/public-data';
import type { Article } from '@/services/types';
export async function getTrending():Promise<Article[]>{if(!isDatabaseConfigured())return getArticles({limit:6});const {data,error}=await getDb().rpc('get_trending_articles',{p_limit:6});if(error)throw new Error('Trending stories unavailable');return (data||[]) as Article[];}
