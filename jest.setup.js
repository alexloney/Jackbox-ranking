// Mock localStorage
const createLocalStorageMock = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
});

global.localStorage = createLocalStorageMock();

// Reset mocks before each test
beforeEach(() => {
  global.localStorage = createLocalStorageMock();
});
