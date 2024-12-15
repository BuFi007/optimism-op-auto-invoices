const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustedForwarder with AutomaticPayments", function () {
  let trustedForwarder;
  let automaticPayments;
  let mockToken;
  let owner;
  let user;
  let recipient;

  beforeEach(async function () {
    [owner, user, recipient] = await ethers.getSigners();

    // Deploy TrustedForwarder
    const TrustedForwarder = await ethers.getContractFactory(
      "TrustedForwarder"
    );
    trustedForwarder = await TrustedForwarder.deploy();
    await trustedForwarder.waitForDeployment();

    // Deploy Mock ERC20 Token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("MockToken", "MTK");
    await mockToken.waitForDeployment();

    // Deploy AutomaticPayments with TrustedForwarder
    const AutomaticPayments = await ethers.getContractFactory(
      "AutomaticPayments"
    );
    automaticPayments = await AutomaticPayments.deploy(
      await trustedForwarder.getAddress()
    );
    await automaticPayments.waitForDeployment();

    // Mint tokens to user
    await mockToken.mint(user.address, ethers.parseEther("1000"));
    // Approve AutomaticPayments contract to spend user's tokens
    await mockToken
      .connect(user)
      .approve(await automaticPayments.getAddress(), ethers.parseEther("1000"));
  });

  describe("Meta-transactions for AutomaticPayments", function () {
    it("Should authorize payment through meta-transaction", async function () {
      const amount = ethers.parseEther("100");
      const frequency = 86400; // 1 day
      const validUntil = Math.floor(Date.now() / 1000) + 2592000; // 30 days

      // Create the function call data for authorizePayment
      const automaticPaymentsInterface = new ethers.Interface([
        "function authorizePayment(address,uint256,uint256,uint256,address)",
      ]);

      const data = automaticPaymentsInterface.encodeFunctionData(
        "authorizePayment",
        [
          recipient.address,
          amount,
          frequency,
          validUntil,
          await mockToken.getAddress(),
        ]
      );

      // Create forward request
      const domain = {
        name: "TrustedForwarder",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await trustedForwarder.getAddress(),
      };

      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      };

      const forwardRequest = {
        from: user.address,
        to: await automaticPayments.getAddress(),
        value: 0,
        gas: 500000,
        nonce: await trustedForwarder.getNonce(user.address),
        data: data,
      };

      // Sign the request
      const signature = await user.signTypedData(domain, types, forwardRequest);

      // Execute the meta-transaction
      await trustedForwarder.execute(forwardRequest, signature);

      // Verify the payment was authorized
      const payment = await automaticPayments.getPaymentInfo(
        user.address,
        recipient.address
      );
      expect(payment.isActive).to.be.true;
      expect(payment.amount).to.equal(amount);
      expect(payment.to).to.equal(recipient.address);
    });

    it("Should execute payment through meta-transaction", async function () {
      // First authorize a payment directly
      const amount = ethers.parseEther("100");
      const frequency = 86400;
      const validUntil = Math.floor(Date.now() / 1000) + 2592000;

      await automaticPayments
        .connect(user)
        .authorizePayment(
          recipient.address,
          amount,
          frequency,
          validUntil,
          await mockToken.getAddress()
        );

      // Create the function call data for executePayment
      const automaticPaymentsInterface = new ethers.Interface([
        "function executePayment(address,address)",
      ]);

      const data = automaticPaymentsInterface.encodeFunctionData(
        "executePayment",
        [user.address, recipient.address]
      );

      // Create forward request
      const domain = {
        name: "TrustedForwarder",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await trustedForwarder.getAddress(),
      };

      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      };

      const forwardRequest = {
        from: user.address,
        to: await automaticPayments.getAddress(),
        value: 0,
        gas: 500000,
        nonce: await trustedForwarder.getNonce(user.address),
        data: data,
      };

      // Sign the request
      const signature = await user.signTypedData(domain, types, forwardRequest);

      // Execute the meta-transaction
      await trustedForwarder.execute(forwardRequest, signature);

      // Verify the payment was executed
      const recipientBalance = await mockToken.balanceOf(recipient.address);
      expect(recipientBalance).to.equal(amount);
    });

    it("Should cancel payment through meta-transaction", async function () {
      // First authorize a payment
      const amount = ethers.parseEther("100");
      const frequency = 86400;
      const validUntil = Math.floor(Date.now() / 1000) + 2592000;

      await automaticPayments
        .connect(user)
        .authorizePayment(
          recipient.address,
          amount,
          frequency,
          validUntil,
          await mockToken.getAddress()
        );

      // Create the function call data for cancelPayment
      const automaticPaymentsInterface = new ethers.Interface([
        "function cancelPayment(address)",
      ]);

      const data = automaticPaymentsInterface.encodeFunctionData(
        "cancelPayment",
        [recipient.address]
      );

      // Create forward request
      const domain = {
        name: "TrustedForwarder",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await trustedForwarder.getAddress(),
      };

      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      };

      const forwardRequest = {
        from: user.address,
        to: await automaticPayments.getAddress(),
        value: 0,
        gas: 500000,
        nonce: await trustedForwarder.getNonce(user.address),
        data: data,
      };

      // Sign the request
      const signature = await user.signTypedData(domain, types, forwardRequest);

      // Execute the meta-transaction
      await trustedForwarder.execute(forwardRequest, signature);

      // Verify the payment was cancelled
      const payment = await automaticPayments.getPaymentInfo(
        user.address,
        recipient.address
      );
      expect(payment.isActive).to.be.false;
    });
  });
});
