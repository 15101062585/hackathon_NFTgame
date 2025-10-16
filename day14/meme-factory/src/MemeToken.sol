// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MemeToken is ERC20 {
    uint256 public MAX_SUPPLY;
    uint256 public MINT_AMOUNT;
    uint256 public MINT_PRICE;
    
    bool public mintingEnabled;
    bool private _initialized;
    
    address public factory;
    address public creator;

    constructor() ERC20("TEMPLATE", "TEMPLATE") {
        // 防止实现合约被直接使用
        _disableInitialUse();
    }

    function _disableInitialUse() internal {
        MAX_SUPPLY = type(uint256).max;
        MINT_AMOUNT = 0;
        MINT_PRICE = 0;
        _initialized = true;
        mintingEnabled = false;
        factory = address(0);
        creator = address(0);
    }

    function initialize(
        string memory symbol,
        uint256 totalSupply,
        uint256 perMint,
        uint256 price,
        address _factory,
        address _creator
    ) external {
        require(!_initialized, "Already initialized");
        _initialized = true;
        
        MAX_SUPPLY = totalSupply;
        MINT_AMOUNT = perMint;
        MINT_PRICE = price;
        mintingEnabled = true;
        factory = _factory;
        creator = _creator;
        
        // 设置代币名称和符号
        _name = string(abi.encodePacked("Meme ", symbol));
        _symbol = symbol;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == factory, "Only factory can mint");
        require(mintingEnabled, "Minting disabled");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }

    function disableMinting() external {
        require(msg.sender == creator, "Only creator can disable minting");
        mintingEnabled = false;
    }
    
    // 重写 name() 和 symbol() 以使用存储的变量
    string private _name;
    string private _symbol;
    
    function name() public view virtual override returns (string memory) {
        return _name;
    }
    
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }
}