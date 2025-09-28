//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
import "day02/Counter.sol";

contract testCall{

    //0x9c018209000000000000000000000000c4753c8802178e524cdb766d7e47cfc566e34443
    function callCount(Counter c) public {
        c.count();
    }
    
    //0x759502ce000000000000000000000000c4753c8802178e524cdb766d7e47cfc566e34443
    function lowCallCount(address c) public {
       bytes memory methodData = abi.encodeWithSignature("count()");
       c.call(methodData);
    }
}