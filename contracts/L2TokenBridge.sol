// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@eth-optimism/contracts/L2/messaging/L2CrossDomainMessenger.sol";

contract L2TokenBridge is Ownable {
    mapping(address => address) public l1TokenToL2Token;
    address public l1TokenBridge; // Address of the bridge contract in L1
    L2CrossDomainMessenger public l2Messenger;

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

    /**
     * @param _l2CrossDomainMessenger 0x4200000000000000000000000000000000000007 Mainnet Optimism)
     * @param _l1TokenBridge L1TokenBridge address
     */
    constructor(address _l2CrossDomainMessenger, address _l1TokenBridge) {
        require(_l2CrossDomainMessenger != address(0), "Invalid L2 messenger");
        require(_l1TokenBridge != address(0), "Invalid L1 token bridge");

        l2Messenger = IL2CrossDomainMessenger(_l2CrossDomainMessenger);
        l1TokenBridge = _l1TokenBridge;
    }

    /**
     * @dev Allows updating the L1 bridge contract address.
     */
    function setL1TokenBridge(address _l1TokenBridge) external onlyOwner {
        require(_l1TokenBridge != address(0), "Invalid L1 token bridge");
        l1TokenBridge = _l1TokenBridge;
    }

    /**
     * @dev Registers the relationship between an L1 token and its L2 counterpart.
     */
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

    /**
     * @dev Transfers tokens in L2 to the user. Assumes this contract already owns these tokens in L2.
     * @param l1Token Address of the token in L1
     * @param amount Amount of tokens to deliver in L2
     */
    function bridgeToL2(address l1Token, uint256 amount) external {
        address l2Token = l1TokenToL2Token[l1Token];
        require(l2Token != address(0), "Token not supported");
        require(amount > 0, "Amount must be > 0");

        // Transfers L2 tokens to the user. Assumes the contract already has them.
        IERC20(l2Token).transfer(msg.sender, amount);

        emit TokensBridged(l1Token, l2Token, msg.sender, amount);
    }

    /**
     * @dev Initiates a withdrawal to L1, locking the tokens in L2 and sending a message to L1
     *      to finalize the withdrawal there.
     * @param l1Token Address of the token in L1
     * @param amount Amount to withdraw
     */
    function initiateWithdrawal(address l1Token, uint256 amount) external {
        address l2Token = l1TokenToL2Token[l1Token];
        require(l2Token != address(0), "Token not supported");
        require(amount > 0, "Amount must be > 0");

        // The user must have previously approved this amount of l2Token to this contract.
        IERC20(l2Token).transferFrom(msg.sender, address(this), amount);

        // Creates the message that will be sent to L1 to finalize the withdrawal.
        bytes memory message = abi.encodeWithSignature(
            "finalizeWithdrawal(address,address,uint256)",
            msg.sender,
            l1Token,
            amount
        );

        // Sends the message through the messenger to L1.
        // Adjust the gasLimit (e.g., 1_000_000) as needed.
        l2Messenger.sendMessage(l1TokenBridge, message, 1_000_000);

        emit WithdrawalInitiated(l1Token, msg.sender, amount);
    }
}
