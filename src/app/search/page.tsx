import { SearchBox } from '@/components/interactive';
import { Breadcrumbs } from '@/components/editorial';
export const metadata={title:'Search',robots:{index:false,follow:true}};
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string}>}){return <div className="container page-content"><Breadcrumbs items={[{name:'Search',href:'/search'}]}/><div className="page-heading"><p className="eyebrow">FIND YOUR NEXT LEAD</p><h1>Search the wire.</h1><p>News, vehicles, characters, heists and guides.</p></div><SearchBox initialQuery={(await searchParams).q?.slice(0,100)||''}/></div>;}
