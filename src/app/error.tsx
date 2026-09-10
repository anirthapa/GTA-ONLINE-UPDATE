'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="container page-content"><div className="empty-state"><h1>The wire is interrupted.</h1><p style={{margin:'20px auto'}}>We couldn’t load this page. Please try again shortly.</p><button className="button" onClick={reset}>Try again</button></div></div>;}
