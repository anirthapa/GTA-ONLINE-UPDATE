'use client';
import Image from 'next/image';
import { useState } from 'react';
import { editorialImage,mediaSource } from '@/lib/media';
export function MediaImage({src,alt,priority=false,sizes='100vw'}:{src:string|null;alt:string;priority?:boolean;sizes?:string}){
  const [failed,setFailed]=useState(false);
  const selected=failed?editorialImage:mediaSource(src);
  return <Image src={selected} alt={failed?'Original editorial illustration; not a game screenshot':alt} fill sizes={sizes} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} unoptimized={selected.startsWith('https://')} referrerPolicy="no-referrer" className="story-image" onError={()=>setFailed(true)}/>;
}
