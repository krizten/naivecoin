import express from "express";
import { Block, generateNextBlock, getBlockchain } from "./blockchain";
import { connectToPeers, getSockets, initP2PServer } from "./p2p";

const httpPort: number = 3001;
const p2pPort: number = 6001;

const initHttpServer = (myHttpPort: number) => {
  const app = express();
  app.use(express.json());

  // Routes
  app.get("/", (req, res) => {
    res.send({ status: "ok" }).status(200);
  });

  app.get("/blocks", (req, res) => {
    res.send(getBlockchain());
  });

  app.post("/mineBlock", (req, res) => {
    const newBlock: Block = generateNextBlock(req.body.data);
    res.send(newBlock);
  });

  app.get("/peers", (req, res) => {
    res.send(
      getSockets().map(
        (s: any) => `${s._socket.remoteAddress}:${s._socket.remotePort}`
      )
    );
  });

  app.post("/add-peers", (req, res) => {
    connectToPeers(req.body.peer);
    res.send();
  });

  app.listen(myHttpPort, () => {
    console.log(`Listening HTTP on port: ${myHttpPort}`);
  });
};

initHttpServer(httpPort);
initP2PServer(p2pPort);
