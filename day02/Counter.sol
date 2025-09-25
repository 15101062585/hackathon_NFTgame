//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

contract Counter{

    uint public counter;

    constructor(){
        counter = 0;
    }

    function count() public {
        counter += 1;
    }


    function get() public view returns (uint) {
        return counter;
    }

    function add(uint x) public  returns (uint) {
        counter = counter + x;
        return counter;
    }
    
}