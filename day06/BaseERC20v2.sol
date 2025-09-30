// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "day05/BaseErc20.sol";



interface ITokenReceiverV2 {
    function tokensReceived(address _from, address _to, uint256 _value, bytes calldata _data) external returns (bool);
}

contract BaseERC20v2 is BaseERC20{



    function transferWithCallback(address _to,uint256 _value,bytes calldata _data) public returns (bool success){
        require(_to != address(0),"ERC20: transfer to the zero address");
        require(_value<=balances[msg.sender],"ERC20: transfer amount exceeds balance");
        balances[msg.sender] -= _value;
        balances[_to] += _value;

        emit Transfer(msg.sender, _to, _value);
         // 如果目标地址是合约地址，调用tokensReceived方法
        if (isContract(_to)) {
            try ITokenReceiverV2(_to).tokensReceived(msg.sender, _to, _value, _data) returns (bool result) {
                return result;
            } catch {
                // 如果回调失败，返回true，因为转账本身已经成功
                return true;
            }
        }
        
        return true;
    }

}