// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "day05/TokenBank.sol";
import "day05/BaseErc20.sol";

contract TokenBankV2 is TokenBank, ITokenReceiver{

    constructor(address _tokenAddress) TokenBank(_tokenAddress){

    }
    //存款

    function tokenReceived(address _from,address _to,uint256 value) external  override returns(bool){

        require(msg.sender == address(token),"Only token contract can call this method");

        balances[_from] += value;
        
        emit Deposit(_from, value);
        return true;
    }

}