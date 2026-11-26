import 'reflect-metadata';
import { MeasurementUnit } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  fromApiUnit,
  IsApiMeasurementUnit,
  toApiUnit,
  withApiUnit,
} from './measurement-unit.util';

class Probe {
  @IsApiMeasurementUnit()
  unit!: MeasurementUnit;
}

describe('measurement-unit.util', () => {
  it('serialises inch as "in" and cm as "cm"', () => {
    expect(toApiUnit(MeasurementUnit.inch)).toBe('in');
    expect(toApiUnit(MeasurementUnit.cm)).toBe('cm');
    expect(toApiUnit('in')).toBe('in');
    expect(toApiUnit(null)).toBeUndefined();
    expect(toApiUnit(undefined)).toBeUndefined();
  });

  it('maps the wire spelling "in" onto the Prisma enum', () => {
    expect(fromApiUnit('in')).toBe(MeasurementUnit.inch);
    expect(fromApiUnit('cm')).toBe('cm');
    expect(fromApiUnit('inch')).toBe('inch');
    expect(fromApiUnit('furlong')).toBe('furlong');
  });

  it('lets "in", "inch" and "cm" through validation and rejects anything else', () => {
    const check = (unit: unknown) => {
      const probe = plainToInstance(Probe, { unit });
      return { unit: probe.unit, errors: validateSync(probe).length };
    };
    expect(check('in')).toEqual({ unit: 'inch', errors: 0 });
    expect(check('inch')).toEqual({ unit: 'inch', errors: 0 });
    expect(check('cm')).toEqual({ unit: 'cm', errors: 0 });
    expect(check('mm').errors).toBe(1);
    const bad = validateSync(plainToInstance(Probe, { unit: 'mm' }));
    expect(Object.values(bad[0].constraints ?? {})).toEqual([
      'unit must be "cm" or "in"',
    ]);
  });

  it('rewrites the unit on a record without touching other fields', () => {
    expect(
      withApiUnit({ key: 'chest', unit: MeasurementUnit.inch as MeasurementUnit }),
    ).toEqual({ key: 'chest', unit: 'in' });
  });
});
