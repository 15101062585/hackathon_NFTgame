//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
import "day03/Bank.sol";

contract BigBank is Bank{


    // 存款金额必须大于0.001 ether的modifier
    modifier minDeposit() {
        require(msg.value > 0.001 ether, "Deposit must be greater than 0.001 ether");
        _;
    }
    //实现将父级资金转账
    function transfer() public override payable minDeposit(){
        super.transfer();

    }
    // 转移管理员权限
    function transferAdmin(address _newAdmin) external payable onlyAdmin {
        require(_newAdmin != address(0), "Cannot transfer to zero address");
        admin = _newAdmin;
        // 在实际生产中，可能需要两阶段确认机制，但这里简化处理
    }



}