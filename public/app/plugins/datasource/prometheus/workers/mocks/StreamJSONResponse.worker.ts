// Automock (using __mocks__) can't be used for this because we need to be able to
// instantiate this mock worker with mock data provided by the test. And with
// automock, the instantiation would obviously happen directly by the code that is tested.
export class MockWorker {
  mockData: any;
  onmessage: (arg: any) => void;

  constructor(mockData: any) {
    this.mockData = mockData;
  }

  postMessage = jest.fn(function(this: any) {
    this.onmessage({ data: this.mockData });
    this.onmessage({ data: 'DONE' });
  });

  terminate() {}
}
