// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AcademicCertificates {
    struct Certificate {
        bytes32 certHash;
        address issuer;
        uint256 issueTimestamp;
        bool isRevoked;
    }

    event CertificateRegistered(bytes32 indexed certHash, address indexed issuer, uint256 timestamp);

    mapping(bytes32 => Certificate) public certificates;

    function registerCertificate(bytes32 _certHash) external {
        certificates[_certHash] =
            Certificate({certHash: _certHash, issuer: msg.sender, issueTimestamp: block.timestamp, isRevoked: false});

        emit CertificateRegistered(_certHash, msg.sender, block.timestamp);
    }

    function verifyCertificate(bytes32 _certHash)
        external
        view
        returns (bool exists, address issuer, uint256 issueTimestamp, bool isRevoked)
    {
        Certificate memory cert = certificates[_certHash];
        if (cert.issueTimestamp == 0) {
            return (false, address(0), 0, false);
        }

        return (true, cert.issuer, cert.issueTimestamp, cert.isRevoked);
    }
}
