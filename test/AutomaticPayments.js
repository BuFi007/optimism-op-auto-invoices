// test/AutomaticPayments.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("AutomaticPayments", function () {
  let automaticPayments;
  let mockToken;
  let owner;
  let payer;
  let payee;
  let trustedForwarder;

  beforeEach(async function () {
    [owner, payer, payee, trustedForwarder] = await ethers.getSigners();

    // Deploy mock token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock Token", "MTK");

    // Deploy AutomaticPayments
    const AutomaticPayments = await ethers.getContractFactory(
      "AutomaticPayments"
    );
    automaticPayments = await AutomaticPayments.deploy(
      trustedForwarder.address
    );

    // Mint tokens to payer
    await mockToken.mint(payer.address, ethers.parseEther("1000"));
    await mockToken
      .connect(payer)
      .approve(automaticPayments.address, ethers.parseEther("1000"));
  });

  describe("Payment Authorization", function () {
    it("Should allow payment authorization", async function () {
      const amount = ethers.parseEther("100");
      const frequency = 3600; // 1 hour
      const validUntil = (await time.latest()) + 86400; // 1 day

      await expect(
        automaticPayments
          .connect(payer)
          .authorizePayment(
            payee.address,
            amount,
            frequency,
            validUntil,
            mockToken.address
          )
      )
        .to.emit(automaticPayments, "PaymentAuthorized")
        .withArgs(
          payer.address,
          payee.address,
          amount,
          frequency,
          validUntil,
          mockToken.address
        );
    });

    it("Should not allow invalid payment parameters", async function () {
      const amount = ethers.parseEther("100");
      const frequency = 3600;
      const validUntil = (await time.latest()) + 86400;

      await expect(
        automaticPayments
          .connect(payer)
          .authorizePayment(
            ethers.ZeroAddress,
            amount,
            frequency,
            validUntil,
            mockToken.address
          )
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("Payment Execution", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("100");
      const frequency = 3600;
      const validUntil = (await time.latest()) + 86400;

      await automaticPayments
        .connect(payer)
        .authorizePayment(
          payee.address,
          amount,
          frequency,
          validUntil,
          mockToken.address
        );
    });

    it("Should execute payment successfully", async function () {
      await expect(
        automaticPayments.executePayment(payer.address, payee.address)
      )
        .to.emit(automaticPayments, "PaymentExecuted")
        .withArgs(
          payer.address,
          payee.address,
          ethers.parseEther("100"),
          await time.latest(),
          mockToken.address
        );
    });

    it("Should not execute payment too soon", async function () {
      await automaticPayments.executePayment(payer.address, payee.address);

      await expect(
        automaticPayments.executePayment(payer.address, payee.address)
      ).to.be.revertedWith("Payment too soon");
    });
  });

  describe("Payment Cancellation", function () {
    it("Should allow payment cancellation", async function () {
      const amount = ethers.parseEther("100");
      const frequency = 3600;
      const validUntil = (await time.latest()) + 86400;

      await automaticPayments
        .connect(payer)
        .authorizePayment(
          payee.address,
          amount,
          frequency,
          validUntil,
          mockToken.address
        );

      await expect(
        automaticPayments.connect(payer).cancelPayment(payee.address)
      )
        .to.emit(automaticPayments, "PaymentCancelled")
        .withArgs(payer.address, payee.address);
    });
  });
});
