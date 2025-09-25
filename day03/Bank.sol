//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

contract Bank{

    mapping(address => uint) public balances;

    address public immutable admin ;

    address[] public uintArray;

    constructor (){
        admin = msg.sender;
    }

    modifier onlyAdmin(){
        require(msg.sender == admin,"Only admin can call this function");
        _;
    }

    

    function withdraw () external  onlyAdmin payable {
        
        payable(admin).transfer(address(this).balance);

    }

    function transfer () public  payable{
        balances[msg.sender] += msg.value;
        uintArray.push(msg.sender);
    }

}