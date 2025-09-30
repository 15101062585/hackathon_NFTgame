// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface  ITokenReceiver {
    function tokenReceived(address _from,address _to,uint256 _value) external  returns(bool);
}


contract BaseERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;

    uint256 public totalSupply;

    mapping (address => uint256) balances;

    mapping (address => mapping (address => uint256)) allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        // 设置Token的基本信息
        name = "BaseERC20";
        symbol = "BERC20";
        decimals = 18;
        totalSupply = 100000000 * (10 ** uint256(decimals)); // 考虑小数位
        // 初始供应量分配给合约部署者
        balances[msg.sender] = totalSupply;
        // 触发转账事件通知初始供应量的分配
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function balanceOf(address _owner) public view returns (uint256 balance) {
        // 返回指定地址的代币余额
        return balances[_owner];
    }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        // 确保接收地址不为0
        require(_to != address(0), "ERC20: transfer to the zero address");
        // 确保发送者余额充足
        require(_value <= balances[msg.sender], "ERC20: transfer amount exceeds balance");
        
        // 更新余额
        balances[msg.sender] -= _value;
        balances[_to] += _value;
        
        // 触发转账事件
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        // 确保接收地址不为0
        require(_to != address(0), "ERC20: transfer to the zero address");
        // 确保发送者余额充足
        require(_value <= balances[_from], "ERC20: transfer amount exceeds balance");
        // 确保授权额度充足
        require(_value <= allowances[_from][msg.sender], "ERC20: transfer amount exceeds allowance");
        
        // 更新余额
        balances[_from] -= _value;
        balances[_to] += _value;
        // 减少授权额度
        allowances[_from][msg.sender] -= _value;
        
        // 触发转账事件
        emit Transfer(_from, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        // 确保授权地址不为0
        require(_spender != address(0), "ERC20: approve to the zero address");
        
        // 设置授权额度
        allowances[msg.sender][_spender] = _value;
        
        // 触发授权事件
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        // 返回授权额度
        return allowances[_owner][_spender];
    }
    //转账
    function transferWithCallback(address _to, uint256 _value)public returns(bool success){
        // 确保接收地址不为0
        require(_to != address(0), "ERC20: transfer to the zero address");
        // 确保发送者余额充足
        require(_value <= balances[msg.sender], "ERC20: transfer amount exceeds balance");

        balances[msg.sender] -= _value;
        balances[_to] += _value;

        // 触发转账事件
        emit Transfer(msg.sender, _to, _value);

        if(isContract(_to)){
            try ITokenReceiver(_to).tokenReceived(msg.sender,_to,_value) returns (bool result){
                return result;
            }catch {
                // 如果回调失败，返回true，因为转账本身已经成功
                return true;
            }
        }

        
    }

    //查看是否是合约地址
    function isContract(address _addr) public view returns(bool){
        uint32 size;
        
        assembly{
            size := extcodesize(_addr)
        }
        return (size>0);
    }

    
}