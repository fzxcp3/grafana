import oboe from 'oboe';

// See: https://github.com/microsoft/TypeScript/issues/20595#issuecomment-587297818
const postMessage = ((self as unknown) as Worker).postMessage;

export type StreamJSONResponsePayload = {
  data: {
    url: string;
    path?: string;
    limit?: number;
    chunkSize?: number;
    hasObjectResponse?: boolean;
  };
};

export interface StreamJSONResponseWorker extends Worker {
  postMessage(message: StreamJSONResponsePayload['data'], transfer: Transferable[]): void;
  postMessage(message: StreamJSONResponsePayload['data'], options?: PostMessageOptions): void;
}

let isFetching = false;
export function streamJSONResponse(data: StreamJSONResponsePayload['data'], callback: (arg: any) => void) {
  if (isFetching) {
    throw new Error('Worker is already fetching data!');
  }

  const {
    url,
    path = 'data.*',
    limit = Number.MAX_SAFE_INTEGER,
    chunkSize = Number.MAX_SAFE_INTEGER,
    hasObjectResponse = false,
  } = data;
  isFetching = true;

  let nodes: any = hasObjectResponse ? {} : [];
  let numNodes = 0;

  // Important to use oboe 2.1.4!! 2.1.5 can't be used in web workers!
  oboe(url)
    .node(path, function(this: oboe.Oboe, node, _path) {
      numNodes++;

      if (hasObjectResponse) {
        nodes[_path[_path.length - 1]] = node;
      } else {
        nodes.push(node);
      }

      if (nodes.length % chunkSize === 0) {
        callback(nodes);
        nodes = hasObjectResponse ? {} : [];
      }

      if (numNodes > limit) {
        callback(nodes);
        this.abort();
        callback('DONE');
        return oboe.drop;
      }

      // Since we stream chunks, we don't need oboe to build an object.
      // Reduces RAM use dramatically!
      return oboe.drop;
    })
    .fail(error => {
      throw error;
    })
    .done(() => callback('DONE'));
}

self.onmessage = function({ data }: StreamJSONResponsePayload) {
  streamJSONResponse(data, postMessage);
};

export default function dummyRequiredForJestMockImplementationToWork() {}
