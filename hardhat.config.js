require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    "op-sepolia": {
      url: "https://sepolia.optimism.io",
      accounts: [process.env.PRIV_KEY],
      chainId: 11155420,
    },
  },
};
