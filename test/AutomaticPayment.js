const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AutomaticPayments", function () {
  let automaticPayments;
  let trustedForwarder;
  let token;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy TrustedForwarder
    const TrustedForwarder = await ethers.getContractFactory(
      "TrustedForwarder"
    );
    trustedForwarder = await TrustedForwarder.deploy();

    // Deploy test token
    const Token = await ethers.getContractFactory("MyCustomL2Token");
    token = await Token.deploy(
      owner.address, // bridge address (using owner for testing)
      ethers.ZeroAddress, // remote token
      "Test Token",
      "TEST"
    );

    // Deploy AutomaticPayments
    const AutomaticPayments = await ethers.getContractFactory(
      "AutomaticPayments"
    );
    automaticPayments = await AutomaticPayments.deploy(
      await trustedForwarder.getAddress()
    );

    // Mint some tokens to user1
    await token.mint(user1.address, ethers.parseEther("1000"));
  });

  describe("Payment Authorization", function () {
    it("should allow users to authorize payments", async function () {
      const amount = ethers.parseEther("100");
      const frequency = 86400; // 1 day in seconds
      const validUntil = Math.floor(Date.now() / 1000) + 2592000; // 30 days from now

      await expect(
        automaticPayments
          .connect(user1)
          .authorizePayment(
            user2.address,
            amount,
            frequency,
            validUntil,
            await token.getAddress()
          )
      )
        .to.emit(automaticPayments, "PaymentAuthorized")
        .withArgs(
          user1.address,
          user2.address,
          amount,
          frequency,
          validUntil,
          await token.getAddress()
        );
    });

    it("should reject invalid payment parameters", async function () {
      const amount = ethers.parseEther("100");
      const frequency = 86400;
      const validUntil = Math.floor(Date.now() / 1000) + 2592000;

      await expect(
        automaticPayments
          .connect(user1)
          .authorizePayment(
            ethers.ZeroAddress,
            amount,
            frequency,
            validUntil,
            await token.getAddress()
          )
      ).to.be.revertedWith("Invalid recipient");

      await expect(
        automaticPayments
          .connect(user1)
          .authorizePayment(
            user2.address,
            0,
            frequency,
            validUntil,
            await token.getAddress()
          )
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Payment Execution", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("100");
      const frequency = 86400;
      const validUntil = Math.floor(Date.now() / 1000) + 2592000;

      await automaticPayments
        .connect(user1)
        .authorizePayment(
          user2.address,
          amount,
          frequency,
          validUntil,
          await token.getAddress()
        );

      // Approve tokens for automatic payments
      await token
        .connect(user1)
        .approve(
          await automaticPayments.getAddress(),
          ethers.parseEther("1000")
        );
    });

    it("should execute payment successfully", async function () {
      await expect(
        automaticPayments.executePayment(user1.address, user2.address)
      ).to.emit(automaticPayments, "PaymentExecuted");

      const payment = await automaticPayments.getPaymentInfo(
        user1.address,
        user2.address
      );
      expect(payment.isActive).to.be.true;
    });

    it("should prevent executing payment too soon", async function () {
      await automaticPayments.executePayment(user1.address, user2.address);

      await expect(
        automaticPayments.executePayment(user1.address, user2.address)
      ).to.be.revertedWith("Payment too soon");
    });
  });

  describe("Payment Cancellation", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("100");
      const frequency = 86400;
      const validUntil = Math.floor(Date.now() / 1000) + 2592000;

      await automaticPayments
        .connect(user1)
        .authorizePayment(
          user2.address,
          amount,
          frequency,
          validUntil,
          await token.getAddress()
        );
    });

    it("should allow payment cancellation", async function () {
      await expect(
        automaticPayments.connect(user1).cancelPayment(user2.address)
      )
        .to.emit(automaticPayments, "PaymentCancelled")
        .withArgs(user1.address, user2.address);

      const payment = await automaticPayments.getPaymentInfo(
        user1.address,
        user2.address
      );
      expect(payment.isActive).to.be.false;
    });

    it("should prevent executing cancelled payments", async function () {
      await automaticPayments.connect(user1).cancelPayment(user2.address);

      await expect(
        automaticPayments.executePayment(user1.address, user2.address)
      ).to.be.revertedWith("Payment not authorized");
    });
  });

  describe("Payment Queries", function () {
    it("should correctly report payment execution possibility", async function () {
      const amount = ethers.parseEther("100");
      const frequency = 86400;
      const validUntil = Math.floor(Date.now() / 1000) + 2592000;

      await automaticPayments
        .connect(user1)
        .authorizePayment(
          user2.address,
          amount,
          frequency,
          validUntil,
          await token.getAddress()
        );

      expect(
        await automaticPayments.canExecutePayment(user1.address, user2.address)
      ).to.be.true;

      await token
        .connect(user1)
        .approve(await automaticPayments.getAddress(), amount);
      await automaticPayments.executePayment(user1.address, user2.address);

      expect(
        await automaticPayments.canExecutePayment(user1.address, user2.address)
      ).to.be.false;
    });
  });
});
