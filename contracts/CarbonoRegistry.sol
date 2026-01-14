// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CarbonoToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CarbonoRegistry
 * @dev Gestiona el catálogo de proyectos y la gobernanza de auditores y publicadores.
 */
contract CarbonoRegistry is Ownable {
    CarbonoToken public tokenContract;
    uint256 public projectCount;

    struct Project {
        uint256 id;
        address owner;        // Empresa que publica y recibe tokens
        string ipfsHash;      // Enlace a la evidencia en IPFS
        uint256 carbonAmount; // Toneladas registradas
        bool isVerified;      // Aprobación del auditor
        bool isMinted;        // Control de doble emisión
        bool isRejected;      // Estado de rechazo
    }

    mapping(uint256 => Project) public projects;
    mapping(address => bool) public auditors;
    mapping(address => bool) public publicadores;

    event ProjectRegistered(uint256 indexed projectId, address indexed owner, string ipfsHash);
    event ProjectVerified(uint256 indexed projectId, address indexed auditor);
    event ProjectRejected(uint256 indexed projectId, address indexed auditor);
    event CreditsIssued(uint256 indexed projectId, uint256 amount);
    event AuditorAdded(address indexed auditor);
    event PublicadorAdded(address indexed publicador);

    /**
     * @dev Vincula el contrato con el token ECOS al desplegarse.
     * @param _tokenAddress Dirección del contrato CarbonoToken.
     */
    constructor(address _tokenAddress) Ownable(msg.sender) {
        tokenContract = CarbonoToken(_tokenAddress);
    }

    modifier onlyAuditor() {
        require(auditors[msg.sender], "No eres un auditor autorizado");
        _;
    }

    modifier onlyPublicador() {
        require(publicadores[msg.sender], "No tienes permiso para publicar");
        _;
    }

    /**
     * @notice Registra un nuevo proyecto en el catálogo disponible para el Marketplace.
     * @dev Utilizado por el Nodo Publicador. El proyecto nace con `isVerified = false`.
     * @param _ipfsHash CID de IPFS que contiene la documentación técnica.
     * @param _amount Cantidad de toneladas de CO2 que el proyecto representa.
     */
    function registerProject(string memory _ipfsHash, uint256 _amount) external onlyPublicador {
        projectCount++;
        projects[projectCount] = Project({
            id: projectCount,
            owner: msg.sender,
            ipfsHash: _ipfsHash,
            carbonAmount: _amount,
            isVerified: false,
            isMinted: false,
            isRejected: false
        });
        emit ProjectRegistered(projectCount, msg.sender, _ipfsHash);
    }

    /**
     * @notice Valida el registro inicial de un proyecto tras auditar la evidencia en IPFS.
     * @dev Utilizado por el Nodo Auditor. Cambia el estado a `isVerified = true`.
     * @param _projectId ID numérico del proyecto en el catálogo.
     */
    function verifyProject(uint256 _projectId) external onlyAuditor {
        Project storage project = projects[_projectId];
        require(!project.isVerified, "Proyecto ya esta verificado");
        require(!project.isRejected, "Proyecto ya fue rechazado");
        
        project.isVerified = true;
        emit ProjectVerified(_projectId, msg.sender);
    }

    /**
     * @notice Rechaza un proyecto si la evidencia en IPFS no es válida.
     * @dev Utilizado por el Nodo Auditor. El registro queda marcado como rechazado.
     * @param _projectId ID numérico del proyecto.
     */
    function rejectProject(uint256 _projectId) external onlyAuditor {
        Project storage project = projects[_projectId];
        project.isRejected = true;
        emit ProjectRejected(_projectId, msg.sender);
    }

    /**
     * @notice Emite los tokens ECOS correspondientes al proyecto auditado.
     * @dev Puede ser gatillado por el Publicador o el proceso de compra. Llama a mint() en CarbonoToken.
     * @param _projectId ID del proyecto verificado.
     */
    function issueCredits(uint256 _projectId) external {
        Project storage project = projects[_projectId];
        require(project.isVerified, "Pendiente de auditoria");
        require(!project.isMinted, "Tokens ya emitidos");
        require(msg.sender == project.owner, "Solo el publicador reclama sus tokens");

        project.isMinted = true;
        tokenContract.mint(project.owner, project.carbonAmount);
        emit CreditsIssued(_projectId, project.carbonAmount);
    }

    /**
     * @notice Autoriza a una dirección para actuar como Auditor.
     * @param _auditor Dirección de la billetera/nodo del auditor.
     */
    function addAuditor(address _auditor) external onlyOwner {
        auditors[_auditor] = true;
        emit AuditorAdded(_auditor);
    }

    /**
     * @notice Autoriza a una dirección para publicar proyectos en el catálogo.
     * @param _pub Dirección de la billetera/nodo del publicador.
     */
    function addPublicador(address _pub) external onlyOwner {
        publicadores[_pub] = true;
        emit PublicadorAdded(_pub);
    }
}