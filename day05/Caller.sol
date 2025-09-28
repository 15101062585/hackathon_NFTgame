pragma solidity ^0.8.0;

contract Caller {
    function sendEther(address to, uint256 value) public returns (bool) {
        // 使用 call 发送 ether
        (bool success, ) = to.call{value:value}("");
        
        require(success,"sendEther failed");
        
        return success;
    }

    receive() external payable {}
}