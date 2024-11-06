import { writable } from 'svelte/store';

interface SelectedArea {
    x: number;
    y: number;
    width: number;
    height: number;
    imageData?: ImageData;
}

export const currentColor = writable('#000000');
export const backgroundColor = writable('#ffffff');
export const currentTool = writable('pencil');
export const selectedArea = writable<SelectedArea | null>(null);
export const undoStack = writable<ImageData[]>([]);
export const redoStack = writable<ImageData[]>([]);