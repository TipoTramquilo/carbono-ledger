// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CarbonoToken
 * @dev Implementación del token ERC20 "EcoCarbonos" (ECOS) para CarbonoLedger.
 * Incluye funciones de emisión controlada y quema para compensación.
 */
contract CarbonoToken is ERC20, ERC20Burnable, Ownable {
    address public registryContract;

    event RegistryContractUpdated(address indexed newRegistry);

    /**
     * @dev Inicializa el token con nombre y símbolo. El desplegador es el Owner inicial.
     */
    constructor() ERC20("EcoCarbonos", "ECOS") Ownable(msg.sender) {}

    /**
     * @dev Restringe la ejecución de funciones críticas únicamente al contrato CarbonoRegistry.
     */
    modifier onlyRegistry() {
        require(msg.sender == registryContract, "Solo el Registry puede emitir tokens");
        _;
    }

    /**
     * @notice Vincula el contrato de lógica (Registry) con este token.
     * @dev Solo el Owner (Admin) puede llamar a esta función.
     * @param _registry Dirección del contrato CarbonoRegistry desplegado.
     */
    function setRegistryContract(address _registry) external onlyOwner {
        require(_registry != address(0), "Direccion invalida");
        registryContract = _registry;
        emit RegistryContractUpdated(_registry);
    }

    /**
     * @notice Crea nuevos tokens ECOS y los asigna a una dirección.
     * @dev Esta función solo puede ser invocada por el contrato Registry tras una auditoría exitosa.
     * @param to Dirección que recibirá los tokens (Publicador/Generador).
     * @param amount Cantidad de tokens a emitir (1 Token = 1 Tonelada CO2).
     */
    function mint(address to, uint256 amount) external onlyRegistry {
        _mint(to, amount);
    }
}