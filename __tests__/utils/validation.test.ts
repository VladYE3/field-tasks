import { validateTaskDraft } from '../../src/utils/validation';
import type { TaskDraft } from '../../src/types';

const now = new Date('2026-02-05T12:00:00.000Z');

function makeDraft(overrides: Partial<TaskDraft> = {}): TaskDraft {
  return {
    title: 'Fix the gate',
    description: 'The north gate hinge is broken.',
    dueDate: new Date('2026-02-05T13:00:00.000Z'),
    location: { address: 'Central Depot, 1 Industrial Way' },
    attachments: [],
    status: 'new',
    ...overrides,
  };
}

describe('validateTaskDraft', () => {
  it('accepts a complete draft', () => {
    const result = validateTaskDraft(makeDraft(), now);
    expect(result.valid).toBe(true);
  });

  it('rejects an empty title', () => {
    const result = validateTaskDraft(makeDraft({ title: '   ' }), now);
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeTruthy();
  });

  it('rejects an empty description', () => {
    const result = validateTaskDraft(makeDraft({ description: '' }), now);
    expect(result.valid).toBe(false);
    expect(result.errors.description).toBeTruthy();
  });

  it('rejects a missing location', () => {
    const result = validateTaskDraft(makeDraft({ location: { address: '' } }), now);
    expect(result.valid).toBe(false);
    expect(result.errors.location).toBeTruthy();
  });

  it('rejects a due date in the past', () => {
    const result = validateTaskDraft(makeDraft({ dueDate: new Date('2026-02-01T12:00:00.000Z') }), now);
    expect(result.valid).toBe(false);
    expect(result.errors.dueDate).toBeTruthy();
  });

  it('flags due dates under 30 minutes away as a notice, not a hard error', () => {
    const result = validateTaskDraft(makeDraft({ dueDate: new Date('2026-02-05T12:15:00.000Z') }), now);
    expect(result.valid).toBe(true);
    expect(result.errors.dueDateNotice).toBeTruthy();
  });
});
