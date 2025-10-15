// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";

// 添加 EIP-2612 接口
interface IERC20Permit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
    
    function nonces(address owner) external view returns (uint256);
}

contract TokenBank {
    address public owner;
    IERC20 public token;
    
    mapping(address => uint256) public balances;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event MultisigTransferred(address indexed previousMultisig, address indexed newMultisig);
    event PermitDeposit(address indexed user, uint256 amount);

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
        owner = msg.sender;
    }

    modifier onlyMultisig() {
        require(msg.sender == owner, "Only multisig can call");
        _;
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function setAdminSender(address newAdmin) external onlyMultisig {
        require(newAdmin != address(0), "Invalid multisig address");
        require(newAdmin != owner, "New multisig must be different");
        
        owner = newAdmin;
    }

    

    // 新增：使用 EIP-2612 permit 进行存款
    function permitDeposit(
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(value > 0, "Amount must be greater than 0");
        require(deadline >= block.timestamp, "Permit expired");

        // 使用 permit 进行授权
        IERC20Permit(address(token)).permit(
            msg.sender,
            address(this),
            value,
            deadline,
            v,
            r,
            s
        );

        // 执行存款
        bool success = token.transferFrom(msg.sender, address(this), value);
        require(success, "token transfer failed");
        
        balances[msg.sender] += value;
        emit Deposit(msg.sender, value);
        emit PermitDeposit(msg.sender, value);
    }

    // 新增：批量 permit 存款（可选功能）
    function permitDepositWithCallback(
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address callbackTo,
        bytes calldata callbackData
    ) external {
        require(value > 0, "Amount must be greater than 0");
        require(deadline >= block.timestamp, "Permit expired");

        // 使用 permit 进行授权
        IERC20Permit(address(token)).permit(
            msg.sender,
            address(this),
            value,
            deadline,
            v,
            r,
            s
        );

        // 执行存款
        bool success = token.transferFrom(msg.sender, address(this), value);
        require(success, "token transfer failed");
        
        balances[msg.sender] += value;
        emit Deposit(msg.sender, value);
        emit PermitDeposit(msg.sender, value);

        // 执行回调（如果有）
        if (callbackTo != address(0)) {
            (bool callbackSuccess, ) = callbackTo.call(callbackData);
            if (callbackSuccess) {
                // 回调成功
            }
        }
    }

    function withdraw(uint256 value) public {
        require(value > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= value, "Insufficient balance");
        
        balances[msg.sender] -= value;
        bool success = token.transfer(msg.sender, value);
        require(success, "token transfer failed");

        emit Withdraw(msg.sender, value);
    }

    // 辅助函数：获取用户的 nonce（用于前端签名）
    function getTokenNonce(address user) external view returns (uint256) {
        return IERC20Permit(address(token)).nonces(user);
    }

    // 辅助函数：获取银行合约的代币余额
    function getBankTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    // 辅助函数：获取用户的银行余额和代币余额
    function getUserBalances(address user) external view returns (uint256 bankBalance, uint256 tokenBalance) {
        bankBalance = balances[user];
        tokenBalance = token.balanceOf(user);
    }
}

// TokenBankV2 合约（保持你原有的回调功能）
contract TokenBankV2 is TokenBank {
    constructor(address _tokenAddress) TokenBank(_tokenAddress) {}

    // 存款回调接口
    function tokenReceived(address _from, address _to, uint256 value) external returns(bool) {
        require(msg.sender == address(token), "Only token contract can call this method");
        require(_to == address(this), "Invalid recipient");

        balances[_from] += value;
        emit Deposit(_from, value);
        return true;
    }

    // 重写 deposit 函数以支持回调
    function deposit(uint256 value) public  {
        require(value > 0, "Amount must be greater than 0");
        
        // 使用 transferWithCallback 如果可用
        (bool success, ) = address(token).call(
            abi.encodeWithSignature("transferWithCallback(address,uint256)", address(this), value)
        );
        
        if (!success) {
            // 回退到标准的 transferFrom
            bool transferSuccess = token.transferFrom(msg.sender, address(this), value);
            require(transferSuccess, "token transfer failed");
        }
        
        balances[msg.sender] += value;
        emit Deposit(msg.sender, value);
    }
}