// SPDX-License-Identiifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AcademicCertificates} from "../src/CertificateRegistry.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";

contract AcademicCertificatesTest is Test {
    TrustedIssuersRegistry registry;
    AcademicCertificates certs;

    address admin = address(0xA11CE);
    address issuer = address(0x1515E);
    address random = address(0xB0B);

    function setUp() public {
        vm.startPrank(admin);
        registry = new TrustedIssuersRegistry();
        certs = new AcademicCertificates(address(registry));
        registry.addIssuer(issuer, "Universidad de Vanguardia");
        vm.stopPrank();
    }

    function test_EmisorNoRegistradoNoPuedeRegistrar() public {
        vm.prank(random);
        vm.expectRevert("Emisor no autorizado");

        certs.registerCertificate(bytes32(uint256(1)));
    }

    function test_EmisorRegistradoPuedeRegistrar() public {
        bytes32 cert = bytes32(uint256(1));

        vm.startPrank(issuer);
        certs.registerCertificate(cert);

        (bool exists_, address issuer_, uint256 issueTimestamp_, bool isRevoked_) = certs.verifyCertificate(cert);
        assertTrue(exists_);
        assertEq(issuer_, issuer);
        assertFalse(isRevoked_);
        assertTrue(issueTimestamp_ > 0);

        vm.stopPrank();
    }

    function test_VerificarHashDesconocido() public {
        bytes32 cert = bytes32(uint256(1));

        vm.startPrank(issuer);
        (bool exists_, address issuer_, uint256 issueTimestamp_, bool isRevoked_) = certs.verifyCertificate(cert);
        assertFalse(exists_);
        assertEq(issuer_, address(0));
        assertFalse(isRevoked_);
        assertEq(issueTimestamp_, 0);
    }

    function test_RegistrarDosVecesReverts() public {
        bytes32 cert = bytes32(uint256(1));

        vm.startPrank(issuer);
        certs.registerCertificate(cert);

        (bool exists_, address issuer_, uint256 issueTimestamp_, bool isRevoked_) = certs.verifyCertificate(cert);
        assertTrue(exists_);
        assertEq(issuer_, issuer);
        assertFalse(isRevoked_);
        assertTrue(issueTimestamp_ > 0);

        vm.expectRevert("El certificado ya fue registrado");
        certs.registerCertificate(cert);

        vm.stopPrank();

    }

    function test_ElRegistryEsElCorrecto() public {
        assertEq(address(certs.trustedRegistry()), address(registry));
    }

    function test_RevocarUnCertificado() public {
        bytes32 cert = bytes32(uint256(1));

        vm.startPrank(issuer);
        certs.registerCertificate(cert);

        (bool exists_, address issuer_, uint256 issueTimestamp_, bool isRevoked_) = certs.verifyCertificate(cert);
        assertTrue(exists_);
        assertEq(issuer_, issuer);
        assertFalse(isRevoked_);
        assertTrue(issueTimestamp_ > 0);

        // Vamos a revocarlo
        certs.revokeCertificate(cert);
        (, , , isRevoked_) = certs.verifyCertificate(cert);
        assertTrue(isRevoked_);
        vm.stopPrank();
    }

    function test_SoloSePuedeRevocarUnCertificadoExistente() public{
        bytes32 cert = bytes32(uint256(1));

        vm.prank(issuer);
        vm.expectRevert("El certificado no existe");

        certs.revokeCertificate(cert);
    }

    function test_SoloElEmisorOriginalPuedeRevocar() public {
        bytes32 cert = bytes32(uint256(1));

        vm.startPrank(issuer);
        certs.registerCertificate(cert);

        (bool exists_, address issuer_, uint256 issueTimestamp_, bool isRevoked_) = certs.verifyCertificate(cert);
        assertTrue(exists_);
        assertEq(issuer_, issuer);
        assertFalse(isRevoked_);
        assertTrue(issueTimestamp_ > 0);

        vm.stopPrank();

        vm.prank(random);
        vm.expectRevert("Solo el emisor original puede revocar este titulo");
        certs.revokeCertificate(cert);
    }
}

