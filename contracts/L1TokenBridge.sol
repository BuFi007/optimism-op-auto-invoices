// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@eth-optimism/contracts/L1/messaging/L1CrossDomainMessenger.sol";

contract L1TokenBridge is Ownable {
    mapping(address => bool) public supportedTokens;
    L1CrossDomainMessenger public l1Messenger;
    address public l2TokenBridge;

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

    /**
     * @param _l1CrossDomainMessenger Dirección del mensajero en L1
     *        (ejemplo: 0x5086d1eEF304eb5284A0f6720f79403b4e9bE294 en Mainnet)
     * @param _l2TokenBridge Dirección del contrato puente en L2
     */
    constructor(address _l1CrossDomainMessenger, address _l2TokenBridge) {
        require(_l1CrossDomainMessenger != address(0), "Invalid L1 messenger");
        require(_l2TokenBridge != address(0), "Invalid L2 bridge");

        l1Messenger = IL1CrossDomainMessenger(_l1CrossDomainMessenger);
        l2TokenBridge = _l2TokenBridge;
    }

    /**
     * @dev Permite actualizar la dirección del puente en L2.
     */
    function setL2TokenBridge(address _l2TokenBridge) external onlyOwner {
        require(_l2TokenBridge != address(0), "Invalid L2 bridge");
        l2TokenBridge = _l2TokenBridge;
    }

    /**
     * @dev Añade un token soportado para el puente entre L1 y L2.
     */
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }

    /**
     * @dev Inicia un depósito a L2 bloqueando tokens en L1 y enviando un mensaje al puente en L2.
     * @param token Dirección del token en L1
     * @param amount Cantidad a depositar
     */
    function depositToL2(address token, uint256 amount) external {
        require(supportedTokens[token], "Token not supported");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        bytes memory message = abi.encodeWithSignature(
            "bridgeToL2(address,uint256)",
            token,
            amount
        );

        // Envía el mensaje al contrato puente en L2 a través del mensajero L1.
        l1Messenger.sendMessage(
            l2TokenBridge,
            message,
            1_000_000 // Ajustar el gas limit según sea necesario
        );

        emit DepositInitiated(token, msg.sender, amount);
    }

    /**
     * @dev Finaliza un retiro desde L2, liberando tokens en L1 al destinatario.
     * Esta función debe ser llamada por el mensajero L1, actuando en nombre del contrato en L2.
     * @param to Dirección del usuario que recibe los tokens en L1
     * @param token Dirección del token en L1
     * @param amount Cantidad a retirar
     */
    function finalizeWithdrawal(
        address to,
        address token,
        uint256 amount
    ) external {
        require(supportedTokens[token], "Token not supported");

        // Verifica que el remitente del mensaje sea el contrato puente en L2 a través del mensajero L1.
        require(
            l1Messenger.xDomainMessageSender() == l2TokenBridge,
            "Not authorized sender"
        );

        IERC20(token).transfer(to, amount);

        emit WithdrawalFinalized(token, to, amount);
    }
}
