'use client';
export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="panel empty-state"><p className="eyebrow">Newsroom unavailable</p><h1>We couldn’t load this view.</h1><p>Check the Supabase connection and migrations, then retry. No successful save has been confirmed on this screen.</p><button className="button" onClick={reset}>Try again</button></section>;
}
