// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@eth-optimism/contracts/L2/messaging/CrossDomainEnabled.sol";

contract L2TokenBridge is Ownable, CrossDomainEnabled {
    mapping(address => address) public l1TokenToL2Token;
    mapping(address => uint256) public pendingWithdrawals;

    event TokensBridged(
        address indexed l1Token,
        address indexed l2Token,
        address indexed user,
        uint256 amount
    );
    event WithdrawalInitiated(
        address indexed l1Token,
        address indexed user,
        uint256 amount
    );

    constructor(
        address _l2CrossDomainMessenger
    ) CrossDomainEnabled(_l2CrossDomainMessenger) Ownable(msg.sender) {}

    function registerToken(
        address l1Token,
        address l2Token
    ) external onlyOwner {
        require(
            l1Token != address(0) && l2Token != address(0),
            "Invalid addresses"
        );
        l1TokenToL2Token[l1Token] = l2Token;
    }

    function bridgeToL2(address l1Token, uint256 amount) external {
        address l2Token = l1TokenToL2Token[l1Token];
        require(l2Token != address(0), "Token not supported");

        IERC20(l2Token).transfer(msg.sender, amount);

        emit TokensBridged(l1Token, l2Token, msg.sender, amount);
    }

    function initiateWithdrawal(address l1Token, uint256 amount) external {
        address l2Token = l1TokenToL2Token[l1Token];
        require(l2Token != address(0), "Token not supported");

        IERC20(l2Token).transferFrom(msg.sender, address(this), amount);

        bytes memory message = abi.encodeWithSignature(
            "finalizeWithdrawal(address,address,uint256)",
            msg.sender,
            l1Token,
            amount
        );

        sendCrossDomainMessage(
            l1TokenBridge, // Dirección del contrato bridge en L1
            message,
            1000000 // gas limit
        );

        emit WithdrawalInitiated(l1Token, msg.sender, amount);
    }
}
