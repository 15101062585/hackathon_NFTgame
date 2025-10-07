// app/nft-market/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { createPublicClient, http, parseAbiItem, fallback } from 'viem';
import { sepolia } from 'viem/chains';
import Link from 'next/link';

export default function NFTMarket() {
  const [status, setStatus] = useState('disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  const [contractAddress, setContractAddress] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [currentRpc, setCurrentRpc] = useState('');

  const lastBlockRef = useRef<bigint>(BigInt(0));
  const pollingIntervalRef = useRef<NodeJS.Timeout>();

  // 更可靠的 RPC 节点
  const rpcUrls = [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://rpc2.sepolia.org',
    'https://sepolia.drpc.org',
    'https://1rpc.io/sepolia',
    'https://sepolia.gateway.tenderly.co'
  ];

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(message);
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 100));
  };

  // 创建客户端
  const createClient = () => {
    return createPublicClient({
      chain: sepolia,
      transport: fallback(rpcUrls.map(url => http(url, { 
        timeout: 10000,
        retryCount: 2
      })))
    });
  };

  // 查询事件日志
  const queryEvents = async (client: any, fromBlock: bigint, toBlock: bigint) => {
    try {
      // 查询上架事件
      const listedEvents = await client.getLogs({
        address: contractAddress as `0x${string}`,
        event: parseAbiItem('event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 timestamp)'),
        fromBlock,
        toBlock
      });

      // 查询购买事件
      const boughtEvents = await client.getLogs({
        address: contractAddress as `0x${string}`,
        event: parseAbiItem('event NFTBought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, uint256 timestamp)'),
        fromBlock,
        toBlock
      });

      // 查询取消事件
      const cancelledEvents = await client.getLogs({
        address: contractAddress as `0x${string}`,
        event: parseAbiItem('event NFTCancelled(uint256 indexed tokenId, address indexed seller, uint256 timestamp)'),
        fromBlock,
        toBlock
      });

      // 处理上架事件
      listedEvents.forEach((log: any) => {
        const { tokenId, seller, price } = log.args;
        addLog(`🆕 NFT上架 - TokenID: ${tokenId?.toString()}, 卖家: ${seller?.slice(0, 10)}..., 价格: ${price?.toString()} 代币`);
      });

      // 处理购买事件
      boughtEvents.forEach((log: any) => {
        const { tokenId, buyer, seller, price } = log.args;
        addLog(`💰 NFT购买 - TokenID: ${tokenId?.toString()}, 买家: ${buyer?.slice(0, 10)}..., 卖家: ${seller?.slice(0, 10)}..., 价格: ${price?.toString()} 代币`);
      });

      // 处理取消事件
      cancelledEvents.forEach((log: any) => {
        const { tokenId, seller } = log.args;
        addLog(`❌ 取消上架 - TokenID: ${tokenId?.toString()}, 卖家: ${seller?.slice(0, 10)}...`);
      });

      return listedEvents.length + boughtEvents.length + cancelledEvents.length;

    } catch (error) {
      console.error('查询事件失败:', error);
      return 0;
    }
  };

  // 轮询监听事件
  const startPolling = async () => {
    if (!contractAddress) return;

    try {
      const client = createClient();
      
      // 获取当前区块作为起始点
      const currentBlock = await client.getBlockNumber();
      lastBlockRef.current = currentBlock;
      addLog(`🎯 开始轮询监听，起始区块: ${currentBlock.toString()}`);

      // 每 10 秒检查一次新事件
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const client = createClient();
          const currentBlock = await client.getBlockNumber();
          
          if (currentBlock > lastBlockRef.current) {
            addLog(`🔍 检查区块 ${lastBlockRef.current + BigInt(1)} 到 ${currentBlock}`);
            const eventCount = await queryEvents(client, lastBlockRef.current + BigInt(1), currentBlock);
            
            if (eventCount > 0) {
              addLog(`📢 发现 ${eventCount} 个新事件`);
            }
            
            lastBlockRef.current = currentBlock;
          }
        } catch (error) {
          console.error('轮询错误:', error);
          addLog('❌ 轮询检查失败，继续尝试...');
        }
      }, 10000); // 每 10 秒检查一次

    } catch (error: any) {
      addLog(`❌ 启动轮询失败: ${error.message}`);
    }
  };

  const startListening = async () => {
    if (!contractAddress) {
      alert('请输入合约地址');
      return;
    }

    if (!contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      alert('请输入有效的合约地址 (0x开头，42位长度)');
      return;
    }

    try {
      setStatus('connecting');
      addLog('正在连接到区块链...');

      const client = createClient();

      // 测试连接
      try {
        const blockNumber = await client.getBlockNumber();
        addLog(`连接成功！当前区块: ${blockNumber.toString()}`);
        
        // 测试合约是否能正常访问
        const contractCode = await client.getCode({ 
          address: contractAddress as `0x${string}` 
        });
        
        if (contractCode === '0x') {
          addLog('❌ 错误: 该地址不是合约或合约不存在');
          setStatus('error');
          return;
        }
        
        addLog('✅ 合约地址有效');
      } catch (error: any) {
        addLog(`❌ 网络连接失败: ${error.message}`);
        setStatus('error');
        return;
      }

      setStatus('connected');
      setIsListening(true);
      
      // 开始轮询监听
      await startPolling();

    } catch (error: any) {
      console.error('监听启动失败:', error);
      addLog(`❌ 监听启动失败: ${error.message}`);
      setStatus('error');
    }
  };

  const stopListening = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = undefined;
    }
    
    setStatus('disconnected');
    setIsListening(false);
    lastBlockRef.current = BigInt(0);
    addLog('⏹️ 停止监听');
  };

  const clearLogs = () => setLogs([]);

  // 查询历史事件
  const checkPastEvents = async () => {
    if (!contractAddress) return;
    
    try {
      const client = createClient();

      addLog('🔍 查询过去的事件...');
      
      const currentBlock = await client.getBlockNumber();
      const fromBlock = currentBlock - BigInt(5000); // 查询最近5000个区块
      
      // 查询上架事件
      const listedEvents = await client.getLogs({
        address: contractAddress as `0x${string}`,
        event: parseAbiItem('event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 timestamp)'),
        fromBlock,
        toBlock: 'latest'
      });

      // 查询购买事件
      const boughtEvents = await client.getLogs({
        address: contractAddress as `0x${string}`,
        event: parseAbiItem('event NFTBought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, uint256 timestamp)'),
        fromBlock,
        toBlock: 'latest'
      });

      // 查询取消事件
      const cancelledEvents = await client.getLogs({
        address: contractAddress as `0x${string}`,
        event: parseAbiItem('event NFTCancelled(uint256 indexed tokenId, address indexed seller, uint256 timestamp)'),
        fromBlock,
        toBlock: 'latest'
      });

      addLog(`📊 历史事件统计 (最近5000个区块):`);
      addLog(`  上架事件: ${listedEvents.length} 个`);
      addLog(`  购买事件: ${boughtEvents.length} 个`);
      addLog(`  取消事件: ${cancelledEvents.length} 个`);

      // 显示最近的事件详情
      if (listedEvents.length > 0) {
        const recentList = listedEvents[listedEvents.length - 1];
        addLog(`最近上架 - TokenID: ${recentList.args.tokenId}, 价格: ${recentList.args.price} 代币`);
      }
      if (boughtEvents.length > 0) {
        const recentBuy = boughtEvents[boughtEvents.length - 1];
        addLog(`最近购买 - TokenID: ${recentBuy.args.tokenId}, 买家: ${recentBuy.args.buyer?.slice(0, 10)}...`);
      }

    } catch (error: any) {
      addLog(`❌ 查询历史事件失败: ${error.message}`);
    }
  };

  // 测试合约连接
  const testContract = async () => {
    if (!contractAddress) return;
    
    try {
      const client = createClient();

      addLog('🔍 测试合约连接...');
      
      const code = await client.getCode({ address: contractAddress as `0x${string}` });
      if (code === '0x') {
        addLog('❌ 合约不存在或无代码');
      } else {
        if (code) {
          addLog('✅ 合约存在，代码长度: ' + (code.length - 2) / 2 + ' 字节');
        }
        
        // 获取最新区块
        const block = await client.getBlock();
        addLog(`📦 最新区块: ${block.number}, 时间: ${new Date(Number(block.timestamp) * 1000).toLocaleTimeString()}`);
      }
    } catch (error: any) {
      addLog(`❌ 测试失败: ${error.message}`);
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return (
    <div style={{ 
      maxWidth: '1000px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#333', margin: 0 }}>NFTMarket 事件监听器</h1>
        <Link 
          href="/"
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          ← 返回存款系统
        </Link>
      </div>
      
      {/* 调试面板 */}
      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ffc107'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>调试面板 {currentRpc && `| 当前节点: ${currentRpc}`}</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={testContract}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            测试合约连接
          </button>
          <button
            onClick={checkPastEvents}
            style={{
              padding: '8px 16px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            查询历史事件
          </button>
          <div style={{ color: '#856404', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
            状态: {status} | 监听: {isListening ? '✅' : '❌'}
          </div>
        </div>
        <div style={{ marginTop: '10px', color: '#856404', fontSize: '12px' }}>
          使用轮询方式监听，每10秒检查新区块
        </div>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            NFTMarket 合约地址:
          </label>
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="输入 0x 开头的合约地址"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
            disabled={isListening}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          {!isListening ? (
            <button
              onClick={startListening}
              disabled={!contractAddress}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: contractAddress ? 'pointer' : 'not-allowed',
                opacity: contractAddress ? 1 : 0.6,
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              开始监听
            </button>
          ) : (
            <button
              onClick={stopListening}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              停止监听
            </button>
          )}
          
          <button
            onClick={clearLogs}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            清空日志
          </button>
        </div>
        
        <div style={{
          padding: '12px',
          backgroundColor: status === 'connected' ? '#d1fae5' : 
                          status === 'connecting' ? '#fef3c7' : 
                          status === 'error' ? '#fee2e2' : '#f3f4f6',
          color: status === 'connected' ? '#065f46' : 
                status === 'connecting' ? '#92400e' : 
                status === 'error' ? '#dc2626' : '#6b7280',
          borderRadius: '4px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          🔄 状态: {status === 'connected' ? '已连接并监听中' : 
                  status === 'connecting' ? '连接中...' : 
                  status === 'error' ? '连接错误' : '未连接'}
        </div>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>事件日志</h3>
        <div style={{ 
          height: '500px', 
          overflowY: 'auto', 
          border: '1px solid #ddd',
          padding: '15px',
          backgroundColor: '#fafafa',
          fontFamily: 'monospace',
          fontSize: '14px',
          borderRadius: '4px'
        }}>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
              暂无事件日志。
              <br />请先测试合约连接，然后开始监听
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ 
                marginBottom: '8px',
                padding: '8px',
                borderLeft: '4px solid',
                borderLeftColor: log.includes('上架') ? '#10b981' : 
                               log.includes('购买') ? '#3b82f6' : 
                               log.includes('取消') ? '#ef4444' : 
                               log.includes('✅') || log.includes('🆕') || log.includes('💰') ? '#10b981' :
                               log.includes('❌') ? '#ef4444' : '#6b7280',
                backgroundColor: 'white',
                borderRadius: '2px'
              }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}