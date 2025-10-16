// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITokenReceiver {
    function tokenReceived(address _from, address _to, uint256 _value) external returns(bool);
}

contract MyTokenERC2612 {
    string public name;
    string public symbol;
    uint8 public decimals;

    uint256 public totalSupply;

    mapping (address => uint256) balances;
    mapping (address => mapping (address => uint256)) allowances;

    // EIP-2612 相关状态变量
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    mapping (address => uint256) public nonces;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        // 设置Token的基本信息 - 使用你自己的名称
        name = "BERC20-2612";
        symbol = "BERC20-2612";
        decimals = 18;
        totalSupply = 100000000 * (10 ** uint256(decimals));
        
        // 初始供应量分配给合约部署者
        balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);

        // EIP-2612 域名分隔符计算
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balances[_owner];
    }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(_to != address(0), "ERC20: transfer to the zero address");
        require(_value <= balances[msg.sender], "ERC20: transfer amount exceeds balance");
        
        balances[msg.sender] -= _value;
        balances[_to] += _value;
        
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(_to != address(0), "ERC20: transfer to the zero address");
        require(_value <= balances[_from], "ERC20: transfer amount exceeds balance");
        require(_value <= allowances[_from][msg.sender], "ERC20: transfer amount exceeds allowance");
        
        balances[_from] -= _value;
        balances[_to] += _value;
        allowances[_from][msg.sender] -= _value;
        
        emit Transfer(_from, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        require(_spender != address(0), "ERC20: approve to the zero address");
        
        allowances[msg.sender][_spender] = _value;
        
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        return allowances[_owner][_spender];
    }

    // EIP-2612 核心功能：使用签名进行授权
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(deadline >= block.timestamp, "ERC20Permit: expired deadline");
        
        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                owner,
                spender,
                value,
                nonces[owner]++,
                deadline
            )
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                structHash
            )
        );

        address signer = ecrecover(hash, v, r, s);
        require(signer != address(0) && signer == owner, "ERC20Permit: invalid signature");

        allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    // 增强的转账功能（保持你原有的回调功能）
    function transferWithCallback(address _to, uint256 _value) public returns(bool success) {
        require(_to != address(0), "ERC20: transfer to the zero address");
        require(_value <= balances[msg.sender], "ERC20: transfer amount exceeds balance");

        balances[msg.sender] -= _value;
        balances[_to] += _value;

        emit Transfer(msg.sender, _to, _value);

        if(isContract(_to)) {
            try ITokenReceiver(_to).tokenReceived(msg.sender, _to, _value) returns (bool result) {
                return result;
            } catch {
                return true;
            }
        }
        return true;
    }

    // 查看是否是合约地址
    function isContract(address _addr) public view returns(bool) {
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }

    // 辅助函数：获取域名分隔符（用于前端签名）
    function getDomainSeparator() public view returns (bytes32) {
        return DOMAIN_SEPARATOR;
    }

    // 辅助函数：获取当前链ID
    function getChainId() public view returns (uint256) {
        return block.chainid;
    }
}