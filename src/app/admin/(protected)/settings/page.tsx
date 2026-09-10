import { getRecord } from '../../_lib/data';
import { RecordEditor } from '../../_components/editor';
import { CacheNotice } from '../../_components/cache-notice';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; cache?: string }> }) {
  const settings = await getRecord('settings', 'default');
  const { saved, cache } = await searchParams;
  return <><header className="section-heading"><div><p className="eyebrow">Governance</p><h1>Publication settings</h1><p className="muted">Control automatic publication and the evidence behind release announcements.</p></div></header>{saved === '1' && <p className="notice success" role="status">Settings saved.</p>}<CacheNotice state={cache} /><section className="notice" style={{ marginBottom: 24 }}><strong>Evidence before publication.</strong><p>Official sources can support CONFIRMED reporting. Trusted media and community reporting retain a REPORTED label; they cannot establish an official release date. Automatic publication also uses the confidence threshold and backend review checks. Rumors remain in review unless an editor explicitly publishes them with the RUMOR label.</p><p>Release dates require a specific announcement on an approved Rockstar host and the time you verified it.</p></section><RecordEditor entity="settings" record={settings} key={saved ?? 'initial'} /></>;
}
