// test/L1TokenBridge.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("L1TokenBridge", function () {
  let l1Bridge;
  let mockToken;
  let owner;
  let user;
  let mockL1CrossDomainMessenger;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock L1CrossDomainMessenger
    const MockCrossDomainMessenger = await ethers.getContractFactory(
      "MockCrossDomainMessenger"
    );
    mockL1CrossDomainMessenger = await MockCrossDomainMessenger.deploy();

    // Deploy mock ERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock Token", "MTK");

    // Deploy L1TokenBridge
    const L1TokenBridge = await ethers.getContractFactory("L1TokenBridge");
    l1Bridge = await L1TokenBridge.deploy(mockL1CrossDomainMessenger.address);

    // Add token support
    await l1Bridge.addSupportedToken(mockToken.address);

    // Mint tokens to user
    await mockToken.mint(user.address, ethers.parseEther("1000"));
    await mockToken
      .connect(user)
      .approve(l1Bridge.address, ethers.parseEther("1000"));
  });

  describe("Token Support", function () {
    it("Should allow owner to add supported token", async function () {
      const newToken = await (
        await ethers.getContractFactory("MockERC20")
      ).deploy("New Token", "NTK");
      await l1Bridge.addSupportedToken(newToken.address);
      expect(await l1Bridge.supportedTokens(newToken.address)).to.be.true;
    });

    it("Should not allow non-owner to add supported token", async function () {
      const newToken = await (
        await ethers.getContractFactory("MockERC20")
      ).deploy("New Token", "NTK");
      await expect(
        l1Bridge.connect(user).addSupportedToken(newToken.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Deposits", function () {
    it("Should allow deposits of supported tokens", async function () {
      const amount = ethers.parseEther("100");

      await expect(
        l1Bridge.connect(user).depositToL2(mockToken.address, amount)
      )
        .to.emit(l1Bridge, "DepositInitiated")
        .withArgs(mockToken.address, user.address, amount);

      expect(await mockToken.balanceOf(l1Bridge.address)).to.equal(amount);
    });

    it("Should not allow deposits of unsupported tokens", async function () {
      const unsupportedToken = await (
        await ethers.getContractFactory("MockERC20")
      ).deploy("Unsupported", "UNS");
      await expect(
        l1Bridge.connect(user).depositToL2(unsupportedToken.address, 100)
      ).to.be.revertedWith("Token not supported");
    });
  });

  describe("Withdrawals", function () {
    it("Should allow finalization of withdrawals from L2", async function () {
      const amount = ethers.parseEther("100");
      await mockToken.transfer(l1Bridge.address, amount);

      // Simulate call from L2
      await mockL1CrossDomainMessenger.setXDomainMessageSender(
        l2Bridge.address
      );
      await expect(
        l1Bridge.finalizeWithdrawal(user.address, mockToken.address, amount)
      )
        .to.emit(l1Bridge, "WithdrawalFinalized")
        .withArgs(mockToken.address, user.address, amount);

      expect(await mockToken.balanceOf(user.address)).to.equal(amount);
    });

    it("Should not allow unauthorized withdrawal finalization", async function () {
      await expect(
        l1Bridge.finalizeWithdrawal(user.address, mockToken.address, 100)
      ).to.be.revertedWith("Not authorized");
    });
  });
});
