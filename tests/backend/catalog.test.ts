import { describe, expect, it } from 'vitest';
import { parseVehicleCatalog, parseVehicleImage } from '../../src/services/ingestion/catalog';

describe('online vehicle catalog adapter', () => {
  it('accumulates the explicit rows from a catalog table and leaves absent stats unknown', () => {
    const html = `<table><thead><tr><th>Vehicle</th><th>Class</th><th>Price</th><th>Date Added</th></tr></thead><tbody>
      <tr><td><a href="/vehicles/grand-theft-auto-v/horus">Pegassi Horus</a></td><td>Super</td><td>$2,810,000</td><td>September 10, 2026</td></tr>
      <tr><td><a href="/vehicles/grand-theft-auto-v/warden">Gallivanter Warden</a></td><td>SUVs</td><td>—</td><td>August 13, 2026</td></tr>
    </tbody></table>`;
    const rows = parseVehicleCatalog(html, 'https://www.gtabase.com/grand-theft-auto-v/vehicles/', '2026-09-11T00:00:00.000Z');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ slug: 'pegassi-horus', name: 'Pegassi Horus', vehicle_class: 'Super', price: 2810000, top_speed: null, seats: null, added_at: '2026-09-10T00:00:00.000Z' });
    expect(rows[1].price).toBeNull();
    expect(rows.every(row => row.source_url.startsWith('https://www.gtabase.com/'))).toBe(true);
  });

  it('fails closed when the expected catalog table is missing', () => {
    expect(() => parseVehicleCatalog('<main><h1>Unavailable</h1></main>', 'https://www.gtabase.com/vehicles/')).toThrow('catalog table');
  });

  it('extracts a same-origin source image from profile metadata', () => {
    const html = '<meta property="og:image" content="/images/gta-5/vehicles/temp/horus.jpg">';
    expect(parseVehicleImage(html, 'https://www.gtabase.com/vehicles/grand-theft-auto-v/horus')).toBe('https://www.gtabase.com/images/gta-5/vehicles/temp/horus.jpg');
    expect(parseVehicleImage('<meta property="og:image" content="https://images.example.com/car.jpg">', 'https://www.gtabase.com/vehicles/grand-theft-auto-v/horus')).toBeNull();
    expect(parseVehicleImage('<meta property="og:image" content="/images/resources/GTABase-Website-Card-2022.jpg"><script type="application/ld+json">{"image":[{"url":"/igallery/gta5-database/laufer-144.jpg"}]}</script>', 'https://www.gtabase.com/vehicles/grand-theft-auto-v/laufer')).toBe('https://www.gtabase.com/igallery/gta5-database/laufer-144.jpg');
  });
});
