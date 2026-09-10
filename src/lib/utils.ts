import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function label(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()); }
export function date(value: string | null) { return value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)) : 'Not yet published'; }
export function money(value: number | null) { return value == null ? 'Not verified' : `GTA$ ${value.toLocaleString('en-US')}`; }
