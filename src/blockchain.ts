import * as CryptoJS from "crypto-js";
import {
  BLOCK_GENERATION_INTERVAL,
  DIFFICULTY_ADJUSTMENT_INTERVAL,
} from "./constants";
import { broadcastLatest } from "./p2p";
import { hexToBinary } from "./util";

// Block definition
class Block {
  public index: number;
  public hash: string;
  public previousHash: string;
  public timestamp: number;
  public data: string;
  public difficulty: number;
  public nonce: number;

  constructor({
    index,
    hash,
    previousHash,
    timestamp,
    data,
    difficulty,
    nonce,
  }: {
    index: number;
    hash: string;
    previousHash: string;
    timestamp: number;
    data: string;
    difficulty: number;
    nonce: number;
  }) {
    this.index = index;
    this.hash = hash;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
    this.hash = hash;
    (this.difficulty = difficulty), (this.nonce = nonce);
  }
}

const genesisBlock = new Block({
  index: 0,
  hash: "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7",
  previousHash: "",
  timestamp: 1465154705,
  data: "My Genesis Block!!!",
  difficulty: 0,
  nonce: 0,
});

// Blockchain
let blockchain: Block[] = [genesisBlock];

// Fetch Blockchain
const getBlockchain = (): Block[] => blockchain;

// Fetch lastest block in the blockchain
const getLatestBlock = (): Block => blockchain[blockchain.length - 1];

// Fetch current timestamp
const getCurrentTimestamp = (): number =>
  Math.round(new Date().getTime() / 1000);

// Calculate hash
const calculateHash = ({
  index,
  previousHash,
  timestamp,
  data,
}: {
  index: number;
  previousHash: string;
  timestamp: number;
  data: string;
}): string => {
  return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
};

// Calculate hash of block in the blockchain
const calculateHashForBlock = (block: Block): string => {
  return calculateHash({
    index: block.index,
    previousHash: block.previousHash,
    timestamp: block.timestamp,
    data: block.data,
  });
};

// Find Block
const findBlock = ({
  index,
  previousHash,
  timestamp,
  data,
  difficulty,
}: {
  index: number;
  previousHash: string;
  timestamp: number;
  data: string;
  difficulty: number;
}) => {
  let nonce = 0;
  while (true) {
    const hash = calculateHash({ index, previousHash, timestamp, data });
    if (true) {
      return new Block({
        index,
        hash,
        previousHash,
        timestamp,
        data,
        difficulty,
        nonce,
      });
    }
  }
};

const getAdjustedDifficulty = ({
  latestBlock,
  aBlockchain,
}: {
  latestBlock: Block;
  aBlockchain: Block[];
}) => {
  const prevAdjustmentBlock: Block =
    aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
  const timeExpected: number =
    BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
  const timeTaken: number =
    latestBlock.timestamp - prevAdjustmentBlock.timestamp;
  if (timeTaken < timeExpected / 2) {
    return prevAdjustmentBlock.difficulty + 1;
  } else if (timeTaken > timeExpected * 2) {
    return prevAdjustmentBlock.difficulty - 1;
  } else {
    return prevAdjustmentBlock.difficulty;
  }
};

// Get Difficulty
const getDifficulty = (aBlockchain: Block[]): number => {
  const latestBlock = aBlockchain[aBlockchain.length - 1];
  if (
    latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 &&
    latestBlock.index !== 0
  ) {
    return getAdjustedDifficulty({ latestBlock, aBlockchain });
  }
  return latestBlock.difficulty;
};

const addBlock = (newBlock: Block) => {
    if (isValidBlock({block: newBlock, previousBlock: getLatestBlock()})) {
        blockchain.push(newBlock);
    }
};

// Generate the next block
const generateNextBlock = (blockData: string) => {
  const previousBlock = getLatestBlock();
  const nextIndex = previousBlock.index + 1;
  const nextTimestamp = getCurrentTimestamp();
  const difficulty: number = getDifficulty(getBlockchain());
  const newBlock: Block = findBlock({
    index: nextIndex,
    previousHash: previousBlock.hash,
    timestamp: nextTimestamp,
    data: blockData,
    difficulty,
  });
  broadcastLatest();
  return newBlock;
};

const hasValidHash = (block: Block): boolean => {
  if (!hashMatchesBlockContent(block)) {
    console.log("invalid hash, got:" + block.hash);
    return false;
  }

  if (!hashMatchesDifficulty(block.hash, block.difficulty)) {
    console.log(
      "block difficulty not satisfied. Expected: " +
        block.difficulty +
        "got: " +
        block.hash
    );
  }
  return true;
};

const hashMatchesBlockContent = (block: Block): boolean => {
  const blockHash: string = calculateHashForBlock(block);
  return blockHash === block.hash;
};

const hashMatchesDifficulty = (hash: string, difficulty: number): boolean => {
  const hashInBinary: string = hexToBinary(hash);
  const requiredPrefix: string = "0".repeat(difficulty);
  return hashInBinary.startsWith(requiredPrefix);
};

// Validate block structure & properties to be properly formed
const isValidBlockStructure = (block: Block): boolean => {
  return (
    typeof block.index === "number" &&
    typeof block.hash === "string" &&
    typeof block.previousHash === "string" &&
    typeof block.timestamp === "number" &&
    typeof block.data === "string"
  );
};

// Validate block
const isValidBlock = ({
  block,
  previousBlock,
}: {
  block: Block;
  previousBlock: Block;
}): boolean => {
  if (!isValidBlockStructure(block)) {
    console.log("Invalid Structure");
    return false;
  }
  //   validate index, previous hash and new block hash
  if (previousBlock.index + 1 !== block.index) {
    console.log("Invalid Index");
    return false;
  } else if (previousBlock.hash !== block.previousHash) {
    console.log("Invalid Previous Hash");
    return false;
  } else if (calculateHashForBlock(block) !== block.hash) {
    console.log(`${typeof block.hash} ${typeof calculateHashForBlock(block)}`);
    console.log(`Invalid hash: ${calculateHashForBlock(block)} ${block.hash}`);
    return false;
  } else if (!isValidTimestamp({ block, previousBlock })) {
    console.log("Invalid timestamp");
    return false;
  } else if (!hasValidHash(block)) {
    return false;
  }

  return true;
};

// Validate blockchain
const isValidChain = (blockchainToValidate: Block[]): boolean => {
  const isValidGenesis = (block: Block) => {
    return JSON.stringify(block) === JSON.stringify(genesisBlock);
  };

  if (!isValidGenesis(blockchainToValidate[0])) {
    return false;
  }

  for (let i = 1; i < blockchainToValidate.length; i++) {
    if (
      !isValidBlock({
        block: blockchainToValidate[i],
        previousBlock: blockchainToValidate[i - 1],
      })
    ) {
      return false;
    }
  }

  return true;
};

const isValidTimestamp = ({
  block,
  previousBlock,
}: {
  block: Block;
  previousBlock: Block;
}): boolean => {
  return (
    previousBlock.timestamp - 60 < block.timestamp &&
    block.timestamp - 60 < getCurrentTimestamp()
  );
};

// Add a new block to the blockchain
const addBlockToChain = (block: Block) => {
  if (isValidBlock({ block, previousBlock: getLatestBlock() })) {
    blockchain.push(block);
    return true;
  }
  return false;
};

// Update blockchain
const replaceChain = (blocks: Block[]) => {
  if (isValidChain(blocks) && blocks.length > getBlockchain().length) {
    console.log(
      `Receiving blockchain is valid. Replacing current blockchain with received blockchain`
    );
    blockchain = blocks;
    broadcastLatest();
  } else {
    console.log(`Received blockchain is invalid`);
  }
};

export {
  Block,
  getBlockchain,
  getLatestBlock,
  generateNextBlock,
  addBlockToChain,
  isValidBlockStructure,
  replaceChain,
};
