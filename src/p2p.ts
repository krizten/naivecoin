import { Server, WebSocket } from "ws";
import {
  addBlockToChain,
  Block,
  getBlockchain,
  getLatestBlock,
  isValidBlockStructure,
  replaceChain,
} from "./blockchain";

const sockets: WebSocket[] = [];

enum MessageType {
  QUERY_LATEST = 0,
  QUERY_ALL = 1,
  RESPONSE_BLOCKCHAIN = 2,
}

interface Message {
  type: MessageType;
  data: any;
}

const JSONToObject = <T>(data: string): T | null => {
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

const getSockets = () => sockets;

const write = ({ ws, message }: { ws: WebSocket; message: Message }) => {
  ws.send(JSON.stringify(message));
};

const broadcast = (message: Message) => {
  for (let i = 0; i < sockets.length; i++) {
    write({ ws: sockets[i], message });
  }
};

const queryChainLengthMsg = (): Message => ({
  type: MessageType.QUERY_LATEST,
  data: null,
});

const queryAllMsg = (): Message => ({
  type: MessageType.QUERY_ALL,
  data: null,
});

const responseChainMsg = (): Message => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify(getBlockchain()),
});

const responseLatestMsg = (): Message => {
  return {
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify([getLatestBlock()]),
  };
};

const handleBlockchainResponse = (blocks: Block[]) => {
  if (blocks.length === 0) {
    console.log("Received block chain of size 0");
    return;
  }

  const latestBlockReceived: Block = blocks[blocks.length - 1];
  if (!isValidBlockStructure(latestBlockReceived)) {
    console.log("Block structure is not valid");
    return;
  }

  const latestBlockHeld: Block = getLatestBlock();
  if (latestBlockReceived.index > latestBlockHeld.index) {
    console.log(
      `Blockchain possibly behind. We got: ${latestBlockHeld.index} Peer got: ${latestBlockReceived.index}`
    );
    if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
      if (addBlockToChain(latestBlockReceived)) {
        broadcast(responseLatestMsg());
      }
    } else if (blocks.length === 1) {
      console.log(`We have to query the chain from our peer`);
      broadcast(queryAllMsg());
    } else {
      console.log(`Received blockchain is longer than current blockchain`);
      replaceChain(blocks);
    }
  } else {
    console.log(
      `Received blockchain is not longer than current blockchain. Do nothing`
    );
  }
};

const initMessageHandler = (ws: WebSocket) => {
  ws.on("message", (data: string) => {
    const message = JSONToObject<Message>(data);
    if (message === null) {
      console.log("Could not parse received JSON message " + data);
      return;
    }
    console.log(`Received message: ${JSON.stringify(message)}`);
    switch (message.type) {
      case MessageType.QUERY_LATEST:
        write({ ws, message: responseLatestMsg() });
        break;
      case MessageType.QUERY_ALL:
        write({ ws, message: responseChainMsg() });
        break;
      case MessageType.RESPONSE_BLOCKCHAIN:
        const receivedBlocks = JSONToObject<Block[]>(message.data);
        if (receivedBlocks === null) {
          console.log(`Invalid blocks received`);
          console.log(message.data);
          break;
        }
        handleBlockchainResponse(receivedBlocks);
      default:
        break;
    }
  });
};

const initErrorHandler = (ws: WebSocket) => {
  const closeConnection = (myWs: WebSocket) => {
    console.log(`Connection failed to peer: ${myWs.url}`);
    sockets.splice(sockets.indexOf(myWs), 1);
  };
  ws.on("close", () => closeConnection(ws));
  ws.on("error", () => closeConnection(ws));
};

const broadcastLatest = () => {
  broadcast(responseLatestMsg());
};

const initConnection = (ws: WebSocket) => {
  sockets.push(ws);
  initMessageHandler(ws);
  initErrorHandler(ws);
  write({ ws, message: queryChainLengthMsg() });
};

const initP2PServer = (p2pPort: number) => {
  const server: Server = new WebSocket.Server({ port: p2pPort });
  server.on("connection", (ws: WebSocket) => {
    initConnection(ws);
  });
  console.log(`Listening websocket P2P port on: ${p2pPort}`);
};

const connectToPeers = (newPeer: string) => {
  const ws: WebSocket = new WebSocket(newPeer);
  ws.on("open", () => {
    initConnection(ws);
  });
  ws.on("error", () => {
    console.log("Connection failed");
  });
};

export { connectToPeers, broadcastLatest, initP2PServer, getSockets };
