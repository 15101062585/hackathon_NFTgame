// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MemeFactory.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address projectTreasury = vm.envAddress("PROJECT_TREASURY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        MemeFactory factory = new MemeFactory(projectTreasury);
        
        console.log("MemeFactory deployed at:", address(factory));
        console.log("Implementation address:", factory.memeTokenImplementation());
        
        vm.stopBroadcast();
    }
}