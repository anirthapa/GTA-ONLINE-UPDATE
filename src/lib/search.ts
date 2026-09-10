import 'server-only';
import { getDb,isDatabaseConfigured } from '@/lib/db';
import { getGuides,getVehicles } from '@/services/public-data';
import { demoAllowed } from '@/services/demo';
import type { Guide,Vehicle } from '@/services/types';
export async function searchCatalog(query:string):Promise<{guides:Guide[];vehicles:Vehicle[]}>{
  const term=query.toLowerCase();
  if(!isDatabaseConfigured()) {const [guides,vehicles]=await Promise.all([getGuides(),getVehicles()]);return{guides:guides.filter(g=>(g.title+' '+g.description).toLowerCase().includes(term)).slice(0,5),vehicles:vehicles.filter(v=>v.name.toLowerCase().includes(term)).slice(0,5)};}
  const pattern=`%${query.replace(/[\\%_]/g,'\\$&')}%`;
  const terms=query.normalize('NFKC').match(/[\p{L}\p{N}]+/gu) || [];
  const prefixQuery=terms.slice(0,12).map(term=>`${term}:*`).join(' & ');
  let guidesQuery=getDb().from('guides').select('*').textSearch('search_document',prefixQuery || '__no_search_terms__',{config:'simple'}).limit(5);
  let vehiclesQuery=getDb().from('vehicles').select('*').ilike('name',pattern).limit(5);
  if(!demoAllowed()){guidesQuery=guidesQuery.eq('is_seed',false).in('verification_status',['CONFIRMED','REPORTED']).not('verified_at','is',null);vehiclesQuery=vehiclesQuery.eq('is_seed',false).not('verified_at','is',null);}
  const [guides,vehicles]=await Promise.all([guidesQuery,vehiclesQuery]);
  if(guides.error||vehicles.error)throw new Error('Catalog search failed');
  return {guides:(guides.data||[]) as Guide[],vehicles:(vehicles.data||[]) as Vehicle[]};
}
