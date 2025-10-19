// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Multicall {
    function multicall(address[] calldata targets, bytes[] calldata data) 
        external 
        returns (bytes[] memory) 
    {
        require(targets.length == data.length, "Array length mismatch");
        bytes[] memory results = new bytes[](data.length);
        
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].delegatecall(data[i]);
            require(success, "Multicall call failed");
            results[i] = result;
        }
        return results;
    }

    function multicallSingleTarget(address target, bytes[] calldata data) 
        external 
        returns (bytes[] memory) 
    {
        bytes[] memory results = new bytes[](data.length);
        
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = target.delegatecall(data[i]);
            require(success, "Multicall call failed");
            results[i] = result;
        }
        return results;
    }
}