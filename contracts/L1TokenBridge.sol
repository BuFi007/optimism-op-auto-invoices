// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@eth-optimism/contracts/L1/messaging/CrossDomainEnabled.sol";

contract L1TokenBridge is Ownable, CrossDomainEnabled {
    mapping(address => bool) public supportedTokens;

    event DepositInitiated(
        address indexed token,
        address indexed from,
        uint256 amount
    );
    event WithdrawalFinalized(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    constructor(
        address _l1CrossDomainMessenger
    ) CrossDomainEnabled(_l1CrossDomainMessenger) Ownable(msg.sender) {}

    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }

    function depositToL2(address token, uint256 amount) external {
        require(supportedTokens[token], "Token not supported");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        bytes memory message = abi.encodeWithSignature(
            "bridgeToL2(address,uint256)",
            token,
            amount
        );

        sendCrossDomainMessage(
            l2TokenBridge, // Dirección del contrato bridge en L2
            message,
            1000000 // gas limit
        );

        emit DepositInitiated(token, msg.sender, amount);
    }

    function finalizeWithdrawal(
        address to,
        address token,
        uint256 amount
    ) external onlyFromCrossDomainAccount(l2TokenBridge) {
        require(supportedTokens[token], "Token not supported");

        IERC20(token).transfer(to, amount);

        emit WithdrawalFinalized(token, to, amount);
    }
}
