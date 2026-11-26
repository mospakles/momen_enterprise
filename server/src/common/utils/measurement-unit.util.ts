import { applyDecorators } from '@nestjs/common';
import { MeasurementUnit } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum } from 'class-validator';

/** The unit spelling the storefront/admin use on the wire. Prisma's enum
 * member is `inch` (mapped to "in" only in the database), so every response
 * goes through `toApiUnit` and every request through `fromApiUnit`. */
export type ApiMeasurementUnit = 'cm' | 'in';

export const API_MEASUREMENT_UNITS: ApiMeasurementUnit[] = ['cm', 'in'];

export function toApiUnit(unit: MeasurementUnit | string): ApiMeasurementUnit;
export function toApiUnit(
  unit: MeasurementUnit | string | null | undefined,
): ApiMeasurementUnit | undefined;
export function toApiUnit(
  unit: MeasurementUnit | string | null | undefined,
): ApiMeasurementUnit | undefined {
  if (unit === null || unit === undefined) return undefined;
  return unit === MeasurementUnit.inch || unit === 'in' ? 'in' : 'cm';
}

/** Maps the wire spelling "in" onto Prisma's `inch`; anything else passes
 * through unchanged so `@IsEnum(MeasurementUnit)` can still reject it. */
export function fromApiUnit(value: unknown): unknown {
  return value === 'in' ? MeasurementUnit.inch : value;
}

/** Request DTO decorator: normalise "in" → "inch" before validation. Runs
 * because the global ValidationPipe has `transform: true`. */
export const NormalizeMeasurementUnit = () =>
  Transform(({ value }) => fromApiUnit(value));

/** Request DTO decorator: accepts "cm", "in" (and the legacy "inch"),
 * storing Prisma's enum value. */
export const IsApiMeasurementUnit = () =>
  applyDecorators(
    NormalizeMeasurementUnit(),
    IsEnum(MeasurementUnit, { message: '$property must be "cm" or "in"' }),
  );

/** Response helper for any record carrying a `unit` column. */
export function withApiUnit<T extends { unit: MeasurementUnit }>(
  record: T,
): Omit<T, 'unit'> & { unit: ApiMeasurementUnit } {
  return { ...record, unit: toApiUnit(record.unit) };
}
