import { create } from 'zustand';
import { scanManager } from '../services/scanService';

export const useScanStore = create(() => scanManager.snapshot());
scanManager.subscribe((snapshot) => useScanStore.setState(snapshot));
