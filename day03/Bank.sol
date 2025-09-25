//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

contract Bank{
    //定义mapping
    mapping(address => uint256) public balances;
    //定义常量
    address public immutable admin ;
    //定义数组
    address[3] public uintArray;
    //构造器 初始化当前部署合约为管理员
    constructor (){
        admin = msg.sender;
    }
    //管理员验证
    modifier onlyAdmin(){
        require(msg.sender == admin,"Only admin can call this function");
        _;
    }

    
    //只有管理员可以取所有的金额
    function withdraw () external  onlyAdmin payable {
        
        payable(admin).transfer(address(this).balance);

    }
    //转账后将数据记录到mapping中
    function transfer () public  payable{
        balances[msg.sender] += msg.value;
        
        
        updateTopDepositors(msg.sender,msg.value);
        
        
    }
    // 更新存款排行榜 - 完整实现
    function updateTopDepositors(address user, uint256 amount) internal {
        // 检查用户是否已经在排行榜中
        uint256 currentRank = 3;
        for (uint256 i = 0; i < 3; i++) {
            if (uintArray[i] == user) {
                currentRank = i;
                break;
            }
        }
        
        // 如果用户已在排行榜中，检查是否需要调整位置
        if (currentRank < 3) {
            // 检查是否应该上升排名
            bool shouldMoveUp = false;
            uint256 newRank = currentRank;
            
            // 向上检查
            for (uint256 i = currentRank; i > 0; i--) {
                if (amount > balances[uintArray[i-1]]) {
                    newRank = i-1;
                    shouldMoveUp = true;
                } else {
                    break;
                }
            }
            
            // 如果需要上升排名
            if (shouldMoveUp && newRank < currentRank) {
                // 将中间的元素下移
                for (uint256 i = currentRank; i > newRank; i--) {
                    uintArray[i] = uintArray[i-1];
                }
                // 将用户地址放在新位置
                uintArray[newRank] = user;
                
                
            }
        } else {
            // 用户不在排行榜中，检查是否应该进入排行榜
            bool shouldUpdate = false;
            uint256 insertIndex = 3; // 默认不插入
            
            // 找到应该插入的位置
            for (uint256 i = 0; i < 3; i++) {
                // 如果当前位置为空地址或者用户金额大于该位置用户的金额
                if (uintArray[i] == address(0) || amount > balances[uintArray[i]]) {
                    insertIndex = i;
                    shouldUpdate = true;
                    break;
                }
            }
            
            // 如果需要更新排行榜
            if (shouldUpdate) {
                // 将后面的元素往后移动
                for (uint256 i = 2; i > insertIndex; i--) {
                    uintArray[i] = uintArray[i - 1];
                }
                
                // 插入新的地址
                uintArray[insertIndex] = user;
                
                
            }
        }
    }

    //获取存款排行榜

    function getTopDepositors() public view returns (address[] memory ,uint256[] memory  ) {
        address[] memory userAddress = new address[](3);
        uint256[] memory userAmount = new uint256[](3); 

        for (uint256 i = 0; i < 3; i++) {
            userAddress[i] = uintArray[i];
            userAmount[i] = balances[uintArray[i]];
        }
        return (userAddress,userAmount);

    }

}