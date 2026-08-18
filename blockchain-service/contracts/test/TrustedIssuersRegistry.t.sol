// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TrustedIssuersRegistry} from "../src/TrustedIssuersRegistry.sol";

contract TrustedIssuersRegistryTest is Test {
    TrustedIssuersRegistry registry;
    address admin = address(0xA11CE);
    address university = address(0xDEAD);

    function setUp() public {
        vm.startPrank(admin);
        registry = new TrustedIssuersRegistry();
        vm.stopPrank();
    }

    function test_AdminEsElDeployer() public view {
        assertEq(registry.admin(), admin);
    }

    function test_AdminPuedeAgregarEmisor() public {
        vm.prank(admin);
        registry.addIssuer(university, "Universidad Vanguardia");

        assertTrue(registry.isTrustedIssuer(university));
        assertEq(registry.issuerName(university), "Universidad Vanguardia");
    }

    function test_NoAdminNoPuedeAgregar() public {
        address random = address(0xB0B);

        vm.prank(random);
        vm.expectRevert("Solo el administrador puede agregar emisores");
        registry.addIssuer(university, "Universidad Vanguardia");
    }

    function test_AdminPuedeEliminarEmisor() public {
        vm.startPrank(admin);
        registry.addIssuer(university, "Universidad Vanguardia");

        assertTrue(registry.isTrustedIssuer(university));
        assertEq(registry.issuerName(university), "Universidad Vanguardia");

        registry.removeIssuer(university);
        assertFalse(registry.isTrustedIssuer(university));

        vm.stopPrank();
    }
}
