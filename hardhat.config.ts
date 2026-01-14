import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    publicador: {
      url: process.env.RPC_PUBLICADOR || "http://127.0.0.1:21000",
      // 🛡️ IMPORTANTE: Cargamos las 3 PKs para que el test no de 'undefined'
      accounts: [
        process.env.PK_PUBLICADOR!,
        process.env.PK_AUDITOR!,
        process.env.PK_COMPRADOR!
      ],
      gasPrice: 0,
      gas: 8000000,
    },
    auditor: {
      url: process.env.RPC_AUDITOR || "http://127.0.0.1:21001",
      accounts: [process.env.PK_AUDITOR!],
      gasPrice: 0,
      gas: 8000000,
    },
    comprador: {
      url: process.env.RPC_COMPRADOR || "http://127.0.0.1:21002",
      accounts: [process.env.PK_COMPRADOR!],
      gasPrice: 0,
      gas: 8000000,
    }
  }
};

export default config;