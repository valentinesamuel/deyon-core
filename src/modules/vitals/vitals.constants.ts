import { PatientVital } from '@modules/core/entities/patientVitals.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const VITAL_QUERY_CONFIG: EntityQueryConfig<PatientVital> = {
  allowedFilters: ['id', 'episodeId'],
  allowedSort: ['createdAt'],
  allowedSearch: [],
  allowedRelations: ['episode'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 15,
};

/** Clinical alert thresholds */
export function evaluateVitalAlerts(dto: {
  celsiusTemperature: number;
  systolicBloodPressure: number;
  diastolicBloodPressure: number;
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
}): string[] {
  const alerts: string[] = [];

  if (dto.celsiusTemperature >= 38.5) alerts.push('FEVER');
  if (dto.celsiusTemperature <= 36.0) alerts.push('HYPOTHERMIA');
  if (dto.systolicBloodPressure >= 140 || dto.diastolicBloodPressure >= 90)
    alerts.push('HYPERTENSION');
  if (dto.systolicBloodPressure < 90) alerts.push('HYPOTENSION');
  if (dto.heartRate >= 100) alerts.push('TACHYCARDIA');
  if (dto.heartRate < 60) alerts.push('BRADYCARDIA');
  if (dto.respiratoryRate >= 20) alerts.push('TACHYPNEA');
  if (dto.oxygenSaturation < 95) alerts.push('LOW_O2_SATURATION');

  return alerts;
}

export function calculateBmi(kilogramWeight: number, centimetreHeight: number): number {
  const heightMetres = centimetreHeight / 100;
  return parseFloat((kilogramWeight / (heightMetres * heightMetres)).toFixed(2));
}
