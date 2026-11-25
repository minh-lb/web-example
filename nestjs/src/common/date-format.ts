export const iso = (value: Date | string | null | undefined) => value == null ? null : new Date(value).toISOString();
