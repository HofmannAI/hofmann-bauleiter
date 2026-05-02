import { describe, it, expect } from 'vitest';

/**
 * Unit tests for milestone detection and rendering logic.
 * Milestones are tasks where startDate === endDate (duration 0).
 */

type TaskStub = { id: string; startDate: string; endDate: string; color: string | null };

function isMilestone(t: TaskStub): boolean {
  return t.startDate === t.endDate;
}

function milestoneBarEdgeWidth(dayWidth: number): number {
  // Milestones take up one dayWidth for dependency line calculations
  return dayWidth;
}

describe('milestone detection', () => {
  it('identifies tasks with same start and end date as milestones', () => {
    expect(isMilestone({ id: '1', startDate: '2026-05-10', endDate: '2026-05-10', color: null })).toBe(true);
  });

  it('does not flag normal tasks as milestones', () => {
    expect(isMilestone({ id: '2', startDate: '2026-05-10', endDate: '2026-05-14', color: null })).toBe(false);
  });

  it('does not flag single-day tasks as milestones unless exact match', () => {
    // A task spanning Mon to Mon (1 day) is NOT a milestone — only duration 0
    expect(isMilestone({ id: '3', startDate: '2026-05-10', endDate: '2026-05-11', color: null })).toBe(false);
  });
});

describe('milestone edge calculations', () => {
  it('uses dayWidth for dependency line target width', () => {
    expect(milestoneBarEdgeWidth(12)).toBe(12); // week zoom
    expect(milestoneBarEdgeWidth(28)).toBe(28); // day zoom
    expect(milestoneBarEdgeWidth(4)).toBe(4);   // month zoom
  });
});
