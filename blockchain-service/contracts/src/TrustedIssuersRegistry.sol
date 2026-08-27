// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TrustedIssuersRegistry {
    address public admin;
    mapping(address => bool) public isTrustedIssuer;
    mapping(address => string) public issuerName;

    event IssuerAdded(address indexed issuer, string name);
    event IssuerRemoved(address indexed issuer);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    constructor() {
        admin = msg.sender; // Ente regulador / Ente gubernamental
    }

    function addIssuer(address _issuer, string memory _name) external {
        require(msg.sender == admin, "Solo el administrador puede agregar emisores");
        isTrustedIssuer[_issuer] = true;
        issuerName[_issuer] = _name;
        emit IssuerAdded(_issuer, _name);
    }

    function removeIssuer(address _issuer) external {
        require(msg.sender == admin, "Solo el administrador puede eliminar emisores");
        require(isTrustedIssuer[_issuer], "El emisor no esta registrado");

        isTrustedIssuer[_issuer] = false;
        delete issuerName[_issuer];
        emit IssuerRemoved(_issuer);
    }

    function transferAdmin(address _newAdmin) external {
        require(msg.sender == admin, "Solo el administrador puede transferir");
        require(_newAdmin != address(0), "Admin invalido");
        
        address previousAdmin = admin;
        admin = _newAdmin;
        emit AdminTransferred(previousAdmin, _newAdmin);
    }
}
