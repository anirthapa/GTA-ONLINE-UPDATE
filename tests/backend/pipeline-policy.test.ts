import { describe, expect, it } from 'vitest';
import { ingestionBudget, isGtaRelevant, isWeeklySourceDue, safeError } from '../../src/services/ingestion/pipeline';
describe('pre-AI cost and log controls', () => {
  it('filters unrelated Rockstar and Red Dead entries without excluding explicit GTA terms', () => {
    expect(isGtaRelevant({ title: 'Rockstar Games news', content: 'Red Dead Redemption receives a fictional test update.' })).toBe(false);
    expect(isGtaRelevant({ title: 'GTA Online fictional test', content: '' })).toBe(true);
    expect(isGtaRelevant({ title: 'Grand Theft Auto VI', content: '' })).toBe(true);
    expect(isGtaRelevant({ title: 'News', content: 'A fictional Cayo Perico test report.' })).toBe(true);
  });
  it('bounds valid runtime values and rejects nonfinite/invalid environment values', () => {
    for (const value of [undefined, 'broken', NaN, Infinity, -10, '0']) expect(ingestionBudget(value)).toBe(240000);
    expect(ingestionBudget(9999999)).toBe(240000); expect(ingestionBudget('10000')).toBe(10000); expect(ingestionBudget(1)).toBe(5000);
  });
  it('redacts secrets before persistence', () => {
    const error = safeError(new Error('sk-secret123 Bearer secret https://api.example.com/?api_key=private&x=1'));
    expect(error).not.toContain('sk-secret123'); expect(error).not.toContain('Bearer secret'); expect(error).not.toContain('private');
  });
  it('gates weekly sources to Thursday after the configured reset window', () => {
    const source = { category: 'WEEKLY_UPDATE' as const };
    expect(isWeeklySourceDue(source, new Date('2026-09-10T09:59:00.000Z'))).toBe(false);
    expect(isWeeklySourceDue(source, new Date('2026-09-10T10:00:00.000Z'))).toBe(true);
    expect(isWeeklySourceDue(source, new Date('2026-09-11T10:00:00.000Z'))).toBe(false);
    expect(isWeeklySourceDue({ category: 'NEWS' }, new Date('2026-09-11T10:00:00.000Z'))).toBe(true);
  });
});
