// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MemeToken is ERC20, Ownable {
    uint256 public MAX_SUPPLY;
    uint256 public MINT_AMOUNT;
    uint256 public MINT_PRICE;
    
    bool public mintingEnabled = true;
    bool private _initialized;

    // 空的构造函数，用于实现合约
    constructor() ERC20("Erc20Proxy", "erc20Proxy") Ownable(msg.sender) {
        // 防止实现合约被直接使用
        MAX_SUPPLY = type(uint256).max;
        MINT_AMOUNT = 0;
        MINT_PRICE = 0;
        _initialized = true;
        mintingEnabled = false;
    }

    function initialize(
        string memory symbol,
        uint256 totalSupply,
        uint256 perMint,
        uint256 price
    ) external {
        require(!_initialized, "Already initialized");
        _initialized = true;
        
        MAX_SUPPLY = totalSupply;
        MINT_AMOUNT = perMint;
        MINT_PRICE = price;
        
        // 设置代币信息
        _transferOwnership(msg.sender);
    }

    function name() public view virtual override returns (string memory) {
        return string(abi.encodePacked("Meme ", symbol()));
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(mintingEnabled, "Minting disabled");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }

    function disableMinting() external onlyOwner {
        mintingEnabled = false;
    }
}