//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
import "day03/Bank.sol";

contract Admin{
    //合约所有者
    address public owner;
    //构造函数 设置部署者为所有者
    constructor(){
        owner = msg.sender;
    }
    //只有所有者可以调用modifier
    modifier onlyOwner  (){
        require(msg.sender == owner,"Only owner can call this function3");
        _;
    }

    function adminWithdraw(IBank bank) external payable {
        bank.withdraw();
        //payable(owner).transfer(address(this).balance);
    }

    // Admin合约所有者可以提取合约中的资金
    function withdrawFunds() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable { 

    }
}