// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract MockCrossDomainMessenger {
    address public xDomainMessageSender;

    function setXDomainMessageSender(address sender) external {
        xDomainMessageSender = sender;
    }
}
