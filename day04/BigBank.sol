//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
import "day03/Bank.sol";

contract BigBank is Bank{

    address public addressNew;

    //大于0.001eth才可以交易
    modifier transferOwner{
        require (msg.value > 0.001 ether,"The transfer amount is greater than 0.001.");
        _;
    }
    //实现将父级资金转账
    function transfer() public override payable transferOwner(){
        super.transfer();

    }
    // 转移管理员权限
    function transferAdmin(address _newAdmin) external payable  transferOwner  {
        require(_newAdmin != address(0), "Cannot transfer to zero address");
        addressNew = _newAdmin;
        // 在实际生产中，可能需要两阶段确认机制，但这里简化处理
    }



}