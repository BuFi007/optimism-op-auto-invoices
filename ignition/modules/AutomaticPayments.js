// ignition/modules/AutomaticPaymentsModule.js

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AutomaticPaymentsModule", (m) => {
  // Deploy TrustedForwarder first
  const trustedForwarder = m.contract("TrustedForwarder");

  // Deploy MyCustomL2Token
  // You'll need to provide these parameters
  const bridge = "0x4200000000000000000000000000000000000010"; // L2 bridge address
  const remoteToken = "0x0000000000000000000000000000000000000000"; // L1 token address
  const tokenName = "MyCustomL2Token";
  const tokenSymbol = "MCL2T";

  const myCustomL2Token = m.contract("MyCustomL2Token", [
    bridge,
    remoteToken,
    tokenName,
    tokenSymbol,
  ]);

  // Deploy AutomaticPayments with TrustedForwarder
  const automaticPayments = m.contract("AutomaticPayments", [trustedForwarder]);

  return {
    trustedForwarder,
    myCustomL2Token,
    automaticPayments,
  };
});
