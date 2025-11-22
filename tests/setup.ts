import '@testing-library/jest-dom';
import { createCanvas } from 'canvas';

// Initialize jsdom globals if not already set
if (typeof global.window === 'undefined') {
  global.window = {} as Window & typeof globalThis;
}
if (typeof global.document === 'undefined') {
  global.document = {} as Document;
}

// Configure canvas support for jsdom
// @ts-ignore - Canvas mock for testing
HTMLCanvasElement.prototype.getContext = function (contextId: string) {
  if (contextId === '2d') {
    const canvas = createCanvas(this.width || 300, this.height || 150);
    return canvas.getContext('2d');
  }
  return null;
};

global.window.pdfjsLib = {
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: jest.fn(),
};

// Create proper jest mock functions for localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

global.localStorage = localStorageMock as any;

// Mock fetch for network requests
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => '',
  headers: new Headers(),
}) as jest.Mock;
