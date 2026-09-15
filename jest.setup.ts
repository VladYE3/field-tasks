// Silence noisy native-module warnings in the Node test environment.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
    mergeItem: jest.fn(async () => undefined),
    multiGet: jest.fn(async () => []),
    multiSet: jest.fn(async () => undefined),
    multiRemove: jest.fn(async () => undefined),
  },
}));

jest.mock('expo-file-system', () => ({
  File: class {
    exists = false;
    constructor(..._args: unknown[]) {}
  },
  Directory: class {
    exists = false;
    create() {}
  },
  Paths: { document: 'file:///document/', cache: 'file:///cache/' },
}));
