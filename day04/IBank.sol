//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
import "day03/Bank.sol";

interface IBank {
    function withdraw () payable external;
    
    function transfer () external payable;
    

}
