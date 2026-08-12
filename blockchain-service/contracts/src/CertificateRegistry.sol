// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITrustedIssuersRegistry {
    function isTrustedIssuer(address _issuer) external view returns (bool);
}

contract AcademicCertificates {
    struct Certificate {
        bytes32 certHash;       // Hash SHA-256 del PDF + Metadata
        address issuer;         // Dirección pública (Wallet) de la Universidad
        uint256 issueTimestamp; // Fecha y hora Unix de emisión
        bool isRevoked;         // Estado de revocación (false por defecto)
    }

    ITrustedIssuersRegistry public immutable trustedRegistry;
    mapping(bytes32 => Certificate) public certificates;

    event CertificateRegistered(bytes32 indexed certHash, address indexed issuer, uint256 timestamp);
    event CertificateRevoked(bytes32 indexed certHash, address indexed issuer);

    constructor(address _trustedRegistryAddress) {
        trustedRegistry = ITrustedIssuersRegistry(_trustedRegistryAddress);
    }

    // Registra un nuevo título en la cadena
    function registerCertificate(bytes32 _certHash) external {
        require(trustedRegistry.isTrustedIssuer(msg.sender), "Emisor no autorizado");
        require(certificates[_certHash].issueTimestamp == 0, "El certificado ya fue registrado");

        certificates[_certHash] = Certificate({
            certHash: _certHash,
            issuer: msg.sender,
            issueTimestamp: block.timestamp,
            isRevoked: false
        });

        emit CertificateRegistered(_certHash, msg.sender, block.timestamp);
    }

    // Consulta de solo lectura (Gratuita / Sin costo de Gas)
    function verifyCertificate(bytes32 _certHash) external view returns (
        bool exists,
        address issuer,
        uint256 issueTimestamp,
        bool isRevoked
    ) {
        Certificate memory cert = certificates[_certHash];
        if (cert.issueTimestamp == 0) {
            return (false, address(0), 0, false);
        }
        return (true, cert.issuer, cert.issueTimestamp, cert.isRevoked);
    }

    // Revoca un título si se detecta un fraude académico
    function revokeCertificate(bytes32 _certHash) external {
        Certificate storage cert = certificates[_certHash];
        require(cert.issueTimestamp != 0, "El certificado no existe");
        require(cert.issuer == msg.sender, "Solo el emisor original puede revocar este titulo");
        
        cert.isRevoked = true;
        emit CertificateRevoked(_certHash, msg.sender);
    }
}
