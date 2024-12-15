// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title IOptimismMintableERC20
 * @notice This interface is available on the OptimismMintableERC20 contract.
 *         We declare it as a separate interface so that it can be used in
 *         custom implementations of OptimismMintableERC20.
 */
interface IOptimismMintableERC20 is IERC20, IERC165 {
    /**
     * @notice Returns the address of the token on the remote chain.
     */
    function remoteToken() external view returns (address);

    /**
     * @notice Returns the address of the bridge on this network.
     */
    function bridge() external view returns (address);

    /**
     * @notice Mints tokens to a recipient.
     *         Only callable by the bridge.
     *
     * @param _to     Address to mint tokens to.
     * @param _amount Amount of tokens to mint.
     */
    function mint(address _to, uint256 _amount) external;

    /**
     * @notice Burns tokens from a sender.
     *         Only callable by the bridge.
     *
     * @param _from   Address to burn tokens from.
     * @param _amount Amount of tokens to burn.
     */
    function burn(address _from, uint256 _amount) external;
}
