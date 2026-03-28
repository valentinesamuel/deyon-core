export enum LabOrderTypeEnum {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

export enum LabOrderStatusEnum {
  PENDING = 'pending',
  COLLECTED = 'collected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum LabPriorityEnum {
  ROUTINE = 'routine',
  URGENT = 'urgent',
  STAT = 'stat',
}
