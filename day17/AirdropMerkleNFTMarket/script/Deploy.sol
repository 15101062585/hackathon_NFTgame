// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/Token.sol";
import "../src/NFT.sol";
import "../src/AirdropMerkleNFTMarket.sol";
import "../src/Multicall.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        Token token = new Token();
        NFT nft = new NFT("https://api.example.com/nft/");
        Multicall multicall = new Multicall();
        
        // 使用与测试相同的 Merkle 根
        bytes32 merkleRoot = 0xc5fd106a8e5214837c622e5fdef112b1d83ad6de66beafb53451c77843c9d04e;
        
        AirdropMerkleNFTMarket market = new AirdropMerkleNFTMarket(
            address(token),
            address(nft),
            merkleRoot,
            deployer
        );

        console.log("Token deployed at:", address(token));
        console.log("NFT deployed at:", address(nft));
        console.log("Market deployed at:", address(market));
        console.log("Multicall deployed at:", address(multicall));

        vm.stopBroadcast();
    }
}