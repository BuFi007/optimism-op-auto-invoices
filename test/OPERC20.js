const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyCustomL2Token", function () {
  let token;
  let bridge;
  let remoteToken;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, bridge, user] = await ethers.getSigners();
    remoteToken = ethers.ZeroAddress;

    const Token = await ethers.getContractFactory("MyCustomL2Token");
    token = await Token.deploy(
      bridge.address,
      remoteToken,
      "MyCustomL2Token",
      "MCT"
    );
  });

  describe("Initial State", function () {
    it("should have correct initial state", async function () {
      expect(await token.BRIDGE()).to.equal(bridge.address);
      expect(await token.REMOTE_TOKEN()).to.equal(remoteToken);
      expect(await token.name()).to.equal("MyCustomL2Token");
      expect(await token.symbol()).to.equal("MCT");
    });

    it("should return correct values from legacy getters", async function () {
      expect(await token.remoteToken()).to.equal(remoteToken);
      expect(await token.bridge()).to.equal(bridge.address);
    });
  });

  describe("Minting", function () {
    it("should allow bridge to mint tokens", async function () {
      const amount = ethers.parseEther("100");

      await expect(token.connect(bridge).mint(user.address, amount))
        .to.emit(token, "Mint")
        .withArgs(user.address, amount);

      expect(await token.balanceOf(user.address)).to.equal(amount);
    });

    it("should prevent non-bridge from minting", async function () {
      const amount = ethers.parseEther("100");

      await expect(
        token.connect(user).mint(user.address, amount)
      ).to.be.revertedWith("MyCustomL2Token: only bridge can mint and burn");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Mint some tokens first
      const amount = ethers.parseEther("100");
      await token.connect(bridge).mint(user.address, amount);
    });

    it("should always revert burn attempts", async function () {
      const amount = ethers.parseEther("50");

      await expect(
        token.connect(bridge).burn(user.address, amount)
      ).to.be.revertedWith("MyCustomL2Token cannot be withdrawn");
    });

    it("should prevent non-bridge from burning", async function () {
      const amount = ethers.parseEther("50");

      await expect(
        token.connect(user).burn(user.address, amount)
      ).to.be.revertedWith("MyCustomL2Token: only bridge can mint and burn");
    });
  });
});
