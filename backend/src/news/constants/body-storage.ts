export const BODY_STORAGE_MODES = ['full', 'metadata_only'] as const;

export type BodyStorageMode = (typeof BODY_STORAGE_MODES)[number];
