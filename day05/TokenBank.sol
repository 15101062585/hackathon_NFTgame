//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";

contract TokenBank{

    address public owner;
    IERC20 token;
    
    mapping(address => uint256) public balances;

    event Deposit(address indexed user,uint256 amount);

    event Withdraw(address indexed user,uint256 amount);


    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
    }

    function deposit(uint value) public payable{

        // 确保存款金额大于0
        require(value > 0, "Amount must be greater than 0");
        bool success = token.transferFrom(msg.sender, address(this), value);
        require(success,"token transfer failed");
        balances[msg.sender] += value;
        emit Deposit(msg.sender, value);
        
    }

    function withdraw(uint256 value) public {
        // 确保取款金额大于0
        require(value > 0, "Amount must be greater than 0");
        balances[msg.sender] -= value;
        bool success = token.transfer(msg.sender,value);
        require(success,"token transfer failed");

        emit Withdraw(msg.sender,value);
    }
    
}