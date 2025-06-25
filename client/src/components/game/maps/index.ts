import { Cell } from '../../../../../../project/src/types';
import { defaultMaps } from './defaultMaps.ts';

// Load maps from localStorage or use defaults
const loadMaps = () => {
  const savedMaps = localStorage.getItem('maps');
  if (savedMaps) {
    try {
      return JSON.parse(savedMaps);
    } catch (e) {
      console.error('Error loading maps from localStorage:', e);
      return defaultMaps;
    }
  }
  return defaultMaps;
};

// Save maps to localStorage and update in-memory maps
export const saveMaps = (newMaps: typeof defaultMaps) => {
  try {
    localStorage.setItem('maps', JSON.stringify(newMaps));
    // Update the in-memory maps object
    Object.assign(maps, newMaps);
  } catch (e) {
    console.error('Error saving maps to localStorage:', e);
  }
};

// Export maps object that can be modified
export const maps = loadMaps();