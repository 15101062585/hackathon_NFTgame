'use client'

import { useState, useEffect, useMemo } from 'react'
import { Connection, clusterApiUrl, PublicKey, Transaction } from '@solana/web3.js'
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js'
import Link from 'next/link'

interface Wallet {
    publicKey: PublicKey
    signTransaction: (transaction: any) => Promise<any>
    signAllTransactions: (transactions: any[]) => Promise<any[]>
}

interface BaseStats {
    health: number;
    mana: number;
    attack: number;
    defense: number;
    speed: number;
}

interface RareStats {
    critRate: number;
    critDamage: number;
    lifeSteal: number;
    cooldownReduction: number;
    dodgeRate: number;
}

interface EquipmentStats {
    baseStats: BaseStats;
    rareStats?: RareStats;
    description: string;
}

interface NFTEquipment {
    id: string;
    name: string;
    image: string;
    type: string;
    rarity: string;
    rarityName: string;
    trait: string;
    stats: EquipmentStats;
    metadata: any;
    mintAddress: string;
    isEquipped: boolean;
    equippedSlot?: 'weapon' | 'armor' | 'accessory';
    attributes?: Array<{ trait_type: string; value: any }>;
    // NFT 标准字段
    symbol?: string;
    external_url?: string;
    properties?: any;
}

interface CharacterStats {
    base: BaseStats & RareStats;
    equipped: {
        weapon?: NFTEquipment;
        armor?: NFTEquipment;
        accessory?: NFTEquipment;
    };
    total: BaseStats & RareStats;
}

// NFT 标准常量
const NFT_STANDARD = {
    SYMBOL: 'EQUIP',
    CREATORS: [
        {
            address: 'YOUR_CREATOR_ADDRESS', // 替换为你的创作者地址
            share: 100
        }
    ],
    COLLECTION: {
        name: 'Game Equipment Collection',
        family: 'Game Assets'
    }
}

// 稀有度排序权重
const rarityOrder = {
    'mythic': 6,
    'legendary': 5,
    'epic': 4,
    'rare': 3,
    'uncommon': 2,
    'common': 1
};

// 装备类型分类
const weaponTypes = ['长剑', '战斧', '法杖', '匕首', '弓箭', '战锤', '双刃剑', '长矛', '拳套'];
const armorTypes = ['皮甲', '布衣', '斗篷', '板甲', '法衣', '轻甲', '重甲'];
const accessoryTypes = ['戒指', '项链', '耳环', '护符', '手镯', '徽章', '吊坠', '头冠', '勋章'];

// 稀有度映射
const rarityMapping = {
    '普通': 'common',
    '精良': 'uncommon',
    '稀有': 'rare',
    '珍稀': 'epic',
    '史诗': 'legendary',
    '神话': 'mythic'
};

declare global {
    interface Window {
        solana?: any
    }
}

export default function CharacterPage() {
    const [wallet, setWallet] = useState<Wallet | null>(null)
    const [nfts, setNfts] = useState<NFTEquipment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [mintStatus, setMintStatus] = useState<string>('')
    const [characterStats, setCharacterStats] = useState<CharacterStats>({
        base: {
            health: 100,
            mana: 100,
            attack: 10,
            defense: 10,
            speed: 5,
            critRate: 0,
            critDamage: 0,
            lifeSteal: 0,
            cooldownReduction: 0,
            dodgeRate: 0
        },
        equipped: {},
        total: {
            health: 100,
            mana: 100,
            attack: 10,
            defense: 10,
            speed: 5,
            critRate: 0,
            critDamage: 0,
            lifeSteal: 0,
            cooldownReduction: 0,
            dodgeRate: 0
        }
    })

    // 初始化连接
    const connection = useMemo(() => new Connection(clusterApiUrl('devnet')), [])

    // 动态创建 Metaplex 实例
    const metaplex = useMemo(() => {
        const mx = Metaplex.make(connection)
        if (wallet) {
            mx.use(walletAdapterIdentity({
                publicKey: wallet.publicKey,
                signTransaction: wallet.signTransaction,
                signAllTransactions: wallet.signAllTransactions
            }))
        }
        return mx
    }, [connection, wallet])

    // 检查 Phantom 钱包
    useEffect(() => {
        const checkPhantomWallet = () => {
            if (typeof window !== 'undefined' && window.solana && window.solana.isPhantom) {
                const phantomWallet = window.solana

                const handleConnect = async () => {
                    try {
                        const publicKey = new PublicKey(phantomWallet.publicKey)
                        setWallet({
                            publicKey,
                            signTransaction: phantomWallet.signTransaction.bind(phantomWallet),
                            signAllTransactions: phantomWallet.signAllTransactions.bind(phantomWallet)
                        })
                    } catch (error) {
                        console.error('钱包连接错误:', error)
                    }
                }

                const handleDisconnect = () => {
                    setWallet(null)
                    setNfts([])
                }

                phantomWallet.on('connect', handleConnect)
                phantomWallet.on('disconnect', handleDisconnect)

                if (phantomWallet.isConnected && phantomWallet.publicKey) {
                    handleConnect()
                }

                return () => {
                    phantomWallet.off('connect', handleConnect)
                    phantomWallet.off('disconnect', handleDisconnect)
                }
            }
        }

        checkPhantomWallet()
    }, [])

    // 获取用户 NFT
    useEffect(() => {
        if (wallet?.publicKey) {
            fetchNFTs()
        }
    }, [wallet, metaplex])

    // 计算角色属性
    useEffect(() => {
        calculateCharacterStats()
    }, [characterStats.equipped, nfts])

    // 增强的从属性数组中提取数值函数 - 支持字符串和数字类型
    const extractStatFromAttributes = (attributes: any[], statName: string, returnString: boolean = false): string | number => {
        if (!attributes || !Array.isArray(attributes)) return returnString ? '' : 0;

        const attribute = attributes.find(attr => {
            if (!attr || typeof attr !== 'object') return false;

            const traitType = attr.trait_type?.toString().toLowerCase();
            const value = attr.value;

            if (!traitType || value === undefined || value === null) return false;

            const statNameLower = statName.toLowerCase();
            return traitType.includes(statNameLower) ||
                statNameLower.includes(traitType) ||
                traitType === statNameLower;
        });

        if (!attribute) return returnString ? '' : 0;

        let value = attribute.value;

        // 如果需要返回字符串，直接返回原始值
        if (returnString) {
            return typeof value === 'string' ? value : String(value);
        }

        // 处理各种值类型 - 仅对数值进行处理
        if (typeof value === 'string') {
            // 处理百分比值
            if (value.includes('%')) {
                value = parseFloat(value.replace('%', '')) || 0;
            }
            // 处理纯数字字符串
            else if (!isNaN(parseFloat(value)) && isFinite(value)) {
                value = parseFloat(value);
            } else {
                value = 0;
            }
        } else if (typeof value === 'number') {
            // 已经是数字，直接使用
            value = value;
        } else {
            value = 0;
        }

        return Number(value) || 0;
    }

    // 专门提取字符串属性的函数
    const extractStringAttribute = (attributes: any[], statName: string): string => {
        const result = extractStatFromAttributes(attributes, statName, true);
        return typeof result === 'string' ? result : String(result);
    }

    // 从装备名称推断类型
    const inferEquipmentTypeFromName = (name: string): string => {
        const lowerName = name.toLowerCase();

        // 武器关键词
        const weaponKeywords = ['剑', '刀', '斧', '杖', '匕首', '弓', '箭', '锤', '矛', '拳', '刃', '武器'];
        // 护甲关键词
        const armorKeywords = ['甲', '盔', '铠', '衣', '袍', '服', '护甲', '盔甲', '铠甲'];
        // 饰品关键词
        const accessoryKeywords = ['戒指', '项链', '耳环', '手镯', '徽章', '吊坠', '头冠', '勋章', '护符', '饰品'];

        for (const keyword of weaponKeywords) {
            if (lowerName.includes(keyword)) {
                return '武器'; // 返回通用类型，后续会映射到具体类型
            }
        }

        for (const keyword of armorKeywords) {
            if (lowerName.includes(keyword)) {
                return '护甲';
            }
        }

        for (const keyword of accessoryKeywords) {
            if (lowerName.includes(keyword)) {
                return '饰品';
            }
        }

        return '未知装备';
    }
    

    // 修复后的从元数据中提取装备信息函数
    const extractEquipmentFromMetadata = (metadata: any, nftId: string, mintAddress: string): NFTEquipment | null => {
        try {
            // 检查是否是我们的装备 NFT - 支持多种标识方式
            const isEquipmentNFT =
                metadata.symbol === 'EQUIP' ||
                metadata.symbol === 'GAME_EQUIP' ||
                metadata.equipment ||
                (metadata.attributes && Array.isArray(metadata.attributes) &&
                    metadata.attributes.some((attr: any) =>
                        attr.trait_type && typeof attr.trait_type === 'string' &&
                        (attr.trait_type.includes('装备') || attr.trait_type.includes('武器') ||
                            attr.trait_type.includes('护甲') || attr.trait_type.includes('饰品'))
                    ));

            if (!isEquipmentNFT) {
                return null;
            }

            let equipmentInfo: any = {};
            let stats: EquipmentStats = {
                baseStats: {
                    health: 0,
                    mana: 0,
                    attack: 0,
                    defense: 0,
                    speed: 0
                },
                description: metadata.description || ''
            };

            // 方式1：从 equipment 字段读取（新版本 NFT 标准）
            if (metadata.equipment && typeof metadata.equipment === 'object') {
                equipmentInfo = { ...metadata.equipment };

                if (metadata.equipment.stats && typeof metadata.equipment.stats === 'object') {
                    stats = {
                        baseStats: {
                            health: Number(metadata.equipment.stats.baseStats?.health) || 0,
                            mana: Number(metadata.equipment.stats.baseStats?.mana) || 0,
                            attack: Number(metadata.equipment.stats.baseStats?.attack) || 0,
                            defense: Number(metadata.equipment.stats.baseStats?.defense) || 0,
                            speed: Number(metadata.equipment.stats.baseStats?.speed) || 0
                        },
                        description: metadata.equipment.stats.description || metadata.description || ''
                    };

                    // 处理稀有属性
                    if (metadata.equipment.stats.rareStats) {
                        stats.rareStats = {
                            critRate: Number(metadata.equipment.stats.rareStats.critRate) || 0,
                            critDamage: Number(metadata.equipment.stats.rareStats.critDamage) || 0,
                            lifeSteal: Number(metadata.equipment.stats.rareStats.lifeSteal) || 0,
                            cooldownReduction: Number(metadata.equipment.stats.rareStats.cooldownReduction) || 0,
                            dodgeRate: Number(metadata.equipment.stats.rareStats.dodgeRate) || 0
                        };
                    }
                }

                // 确保基础信息存在 - 增强类型提取
                equipmentInfo.type = equipmentInfo.type ||
                    extractStatFromAttributes(metadata.attributes, '装备类型') ||
                    extractStatFromAttributes(metadata.attributes, '类型') ||
                    '未知装备';

                // 如果类型仍然是"未知装备"，尝试从名称推断
                if (equipmentInfo.type === '未知装备' && metadata.name) {
                    equipmentInfo.type = inferEquipmentTypeFromName(metadata.name);
                }

                equipmentInfo.trait = equipmentInfo.trait ||
                    extractStatFromAttributes(metadata.attributes, '词条') ||
                    '普通';

                equipmentInfo.rarityName = equipmentInfo.rarityName ||
                    extractStatFromAttributes(metadata.attributes, '稀有度') ||
                    '普通';
                equipmentInfo.rarity = equipmentInfo.rarity ||
                    (rarityMapping[equipmentInfo.rarityName as keyof typeof rarityMapping] || 'common');
            }
            // 方式2：从 attributes 数组读取（兼容旧版本）
            else if (metadata.attributes && Array.isArray(metadata.attributes)) {
                // 从属性中提取装备信息 - 使用字符串提取函数

                equipmentInfo.type = extractStringAttribute(metadata.attributes, '装备类型');



                equipmentInfo.trait = extractStatFromAttributes(metadata.attributes, '词条') ||
                    extractStatFromAttributes(metadata.attributes, '特质') ||
                    '普通';

                const rarityValue = extractStatFromAttributes(metadata.attributes, '稀有度') || '普通';
                equipmentInfo.rarityName = typeof rarityValue === 'string' ? rarityValue : '普通';
                equipmentInfo.rarity = rarityMapping[equipmentInfo.rarityName as keyof typeof rarityMapping] || 'common';

                // 从属性中提取基础属性 - 支持多种属性名称
                stats.baseStats = {
                    health: extractStatFromAttributes(metadata.attributes, '生命值') ||
                        extractStatFromAttributes(metadata.attributes, '生命') ||
                        extractStatFromAttributes(metadata.attributes, 'HP') || 0,
                    mana: extractStatFromAttributes(metadata.attributes, '魔法值') ||
                        extractStatFromAttributes(metadata.attributes, '魔法') ||
                        extractStatFromAttributes(metadata.attributes, 'MP') || 0,
                    attack: extractStatFromAttributes(metadata.attributes, '攻击力') ||
                        extractStatFromAttributes(metadata.attributes, '攻击') ||
                        extractStatFromAttributes(metadata.attributes, 'ATK') || 0,
                    defense: extractStatFromAttributes(metadata.attributes, '防御力') ||
                        extractStatFromAttributes(metadata.attributes, '防御') ||
                        extractStatFromAttributes(metadata.attributes, 'DEF') || 0,
                    speed: extractStatFromAttributes(metadata.attributes, '速度') ||
                        extractStatFromAttributes(metadata.attributes, '敏捷') ||
                        extractStatFromAttributes(metadata.attributes, 'SPD') || 0
                };

                // 从属性中提取稀有属性（仅饰品）
                const critRate = extractStatFromAttributes(metadata.attributes, '暴击率') ||
                    extractStatFromAttributes(metadata.attributes, '暴击') || 0;
                const critDamage = extractStatFromAttributes(metadata.attributes, '暴击伤害') ||
                    extractStatFromAttributes(metadata.attributes, '暴伤') || 0;
                const lifeSteal = extractStatFromAttributes(metadata.attributes, '吸血') || 0;
                const cooldownReduction = extractStatFromAttributes(metadata.attributes, '冷却缩减') ||
                    extractStatFromAttributes(metadata.attributes, '冷却') || 0;
                const dodgeRate = extractStatFromAttributes(metadata.attributes, '闪避率') ||
                    extractStatFromAttributes(metadata.attributes, '闪避') || 0;

                if (critRate > 0 || critDamage > 0 || lifeSteal > 0 || cooldownReduction > 0 || dodgeRate > 0) {
                    stats.rareStats = {
                        critRate,
                        critDamage,
                        lifeSteal,
                        cooldownReduction,
                        dodgeRate
                    };
                }
            } else {
                // 如果都没有有效数据，但符号是 EQUIP，尝试从名称推断
                if (metadata.symbol === 'EQUIP' && metadata.name) {
                    equipmentInfo.type = inferEquipmentTypeFromName(metadata.name);
                    equipmentInfo.trait = '普通';
                    equipmentInfo.rarityName = '普通';
                    equipmentInfo.rarity = 'common';

                    // 设置默认属性
                    stats.baseStats = {
                        health: 10,
                        mana: 10,
                        attack: 5,
                        defense: 5,
                        speed: 2
                    };
                } else {
                    return null;
                }
            }

            // 创建装备对象
            const equipment: NFTEquipment = {
                id: nftId,
                name: metadata.name || '未知装备',
                image: metadata.image || '',
                type: equipmentInfo.type,
                rarity: equipmentInfo.rarity,
                rarityName: equipmentInfo.rarityName,
                trait: equipmentInfo.trait,
                stats: stats,
                metadata: metadata,
                mintAddress: mintAddress,
                isEquipped: false,
                attributes: metadata.attributes,
                symbol: metadata.symbol,
                external_url: metadata.external_url,
                properties: metadata.properties
            };

            console.log('成功解析装备:', equipment.name, '类型:', equipment.type);
            return equipment;
        } catch (error) {
            console.error('解析装备元数据失败:', error, metadata);
            return null;
        }
    }

    // 获取用户 NFT - 增强版本
    const fetchNFTs = async () => {
        if (!wallet?.publicKey) return

        setIsLoading(true)
        try {
            const nftList = await metaplex.nfts().findAllByOwner({ owner: wallet.publicKey })
            console.log('找到 NFT 数量:', nftList.length)

            const equipmentNFTs: NFTEquipment[] = []

            for (const nft of nftList) {
                try {
                    if (nft.uri) {
                        console.log('获取 NFT 元数据:', nft.address.toString())
                        const response = await fetch(nft.uri)
                        if (!response.ok) {
                            console.warn('获取元数据失败:', nft.uri)
                            continue
                        }

                        const metadata = await response.json()
                        console.log('NFT 元数据:', metadata)

                        const equipment = extractEquipmentFromMetadata(metadata, nft.address.toString(), nft.address.toString())
                        if (equipment) {
                            console.log('成功解析装备:', equipment.name)
                            equipmentNFTs.push(equipment)
                        } else {
                            console.log('不是装备 NFT:', metadata.name)
                        }
                    }
                } catch (error) {
                    console.error('获取 NFT 元数据失败:', error)
                }
            }

            // 按稀有度排序
            equipmentNFTs.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity])
            setNfts(equipmentNFTs)
            console.log('最终装备列表:', equipmentNFTs)

        } catch (error) {
            console.error('获取 NFT 失败:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // 计算角色属性 - 增强版本
    const calculateCharacterStats = () => {
        const baseStats = { ...characterStats.base }
        const equipped = characterStats.equipped

        // 重置为基础属性
        const totalStats = { ...baseStats }

        // 累加装备属性
        Object.values(equipped).forEach(equipment => {
            if (!equipment || !equipment.stats) return

            const { baseStats: equipmentBaseStats, rareStats } = equipment.stats

            // 累加基础属性
            if (equipmentBaseStats) {
                Object.keys(equipmentBaseStats).forEach(key => {
                    const statKey = key as keyof BaseStats
                    totalStats[statKey] += equipmentBaseStats[statKey] || 0
                })
            }

            // 累加稀有属性
            if (rareStats) {
                Object.keys(rareStats).forEach(key => {
                    const statKey = key as keyof RareStats
                    totalStats[statKey] += rareStats[statKey] || 0
                })
            }
        })

        setCharacterStats(prev => ({
            ...prev,
            total: totalStats
        }))
    }

    // 装备物品
    const equipItem = (nft: NFTEquipment) => {
        let slot: 'weapon' | 'armor' | 'accessory' | null = null

        if (weaponTypes.includes(nft.type)) {
            slot = 'weapon'
        } else if (armorTypes.includes(nft.type)) {
            slot = 'armor'
        } else if (accessoryTypes.includes(nft.type)) {
            slot = 'accessory'
        }

        if (!slot) {
            console.warn('无法识别的装备类型:', nft.type)
            return
        }

        // 先脱下同类型的装备
        const currentlyEquipped = characterStats.equipped[slot]
        if (currentlyEquipped) {
            unequipItem(currentlyEquipped)
        }

        // 装备新物品
        setCharacterStats(prev => ({
            ...prev,
            equipped: {
                ...prev.equipped,
                [slot]: nft
            }
        }))

        // 更新 NFT 状态
        setNfts(prev => prev.map(item =>
            item.id === nft.id
                ? { ...item, isEquipped: true, equippedSlot: slot }
                : item
        ))

        console.log(`装备 ${nft.name} 到 ${slot} 槽位`)
    }

    // 脱下物品
    const unequipItem = (nft: NFTEquipment) => {
        const slot = nft.equippedSlot
        if (!slot) return

        setCharacterStats(prev => ({
            ...prev,
            equipped: {
                ...prev.equipped,
                [slot]: undefined
            }
        }))

        setNfts(prev => prev.map(item =>
            item.id === nft.id
                ? { ...item, isEquipped: false, equippedSlot: undefined }
                : item
        ))

        console.log(`脱下 ${nft.name}`)
    }

    // 简化的 NFT 销毁函数
    const burnNFT = async (nft: NFTEquipment) => {
        if (!wallet?.publicKey) {
            alert('请先连接钱包')
            return
        }

        if (!window.confirm(`确定要销毁 ${nft.name} 吗？此操作不可逆！`)) {
            return
        }

        setIsLoading(true)
        try {
            const mintAddress = new PublicKey(nft.mintAddress)

            setMintStatus('正在准备销毁交易...')

            // 直接尝试销毁
            const result = await metaplex.nfts().delete({
                mintAddress: mintAddress,
            })

            console.log('NFT 销毁结果:', result)

            // 从列表中移除
            setNfts(prev => prev.filter(item => item.id !== nft.id))

            // 如果装备了，先脱下
            if (nft.isEquipped) {
                unequipItem(nft)
            }

            setMintStatus('🎉 NFT 销毁成功！')
            setTimeout(() => setMintStatus(''), 5000)

        } catch (error: any) {
            console.error('销毁失败:', error)

            let errorMessage = '销毁失败，请重试'

            if (error.message?.includes('user rejected') || error.message?.includes('User rejected')) {
                errorMessage = '用户拒绝了交易签名'
            } else if (error.message?.includes('insufficient funds')) {
                errorMessage = '余额不足，无法支付销毁费用'
            } else if (error.message?.includes('owner') || error.message?.includes('Owner')) {
                errorMessage = '你不是这个 NFT 的所有者'
            } else if (error.message?.includes('not found')) {
                errorMessage = 'NFT 未找到'
            } else if (error.message?.includes('AccountNotFoundError')) {
                errorMessage = 'NFT 元数据不存在，可能已被销毁'
            }

            setMintStatus(`❌ ${errorMessage}`)
            setTimeout(() => setMintStatus(''), 5000)
        } finally {
            setIsLoading(false)
        }
    }

    const connectWallet = async () => {
        if (typeof window !== 'undefined' && window.solana) {
            try {
                await window.solana.connect()
            } catch (error) {
                console.error('连接钱包失败:', error)
                alert('连接钱包失败，请确保已安装 Phantom 钱包')
            }
        } else {
            alert('请安装 Phantom 钱包!')
            window.open('https://phantom.app/', '_blank')
        }
    }

    const disconnectWallet = async () => {
        if (typeof window !== 'undefined' && window.solana) {
            await window.solana.disconnect()
        }
    }

    // 获取装备类型颜色
    const getTypeColor = (type: string) => {
        if (weaponTypes.includes(type)) return 'text-red-500'
        if (armorTypes.includes(type)) return 'text-blue-500'
        if (accessoryTypes.includes(type)) return 'text-purple-500'
        return 'text-gray-500'
    }

    // 获取稀有度颜色
    const getRarityColor = (rarity: string) => {
        const colors = {
            common: 'text-gray-500',
            uncommon: 'text-green-500',
            rare: 'text-blue-500',
            epic: 'text-purple-500',
            legendary: 'text-orange-500',
            mythic: 'text-yellow-500'
        }
        return colors[rarity as keyof typeof colors] || 'text-gray-500'
    }

    // 获取属性显示值
    const getStatDisplay = (value: number, isPercentage: boolean = false) => {
        if (isPercentage) {
            return `${value}%`
        }
        return value.toString()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 font-sans">
            <main className="container mx-auto min-h-screen px-4 py-8">
                {/* 头部 */}
                <div className="flex flex-col lg:flex-row justify-between items-center mb-8">
                    <div className="text-center lg:text-left mb-6 lg:mb-0">
                        <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-lg">👤</span>
                            </div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                角色装备管理
                            </h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 max-w-md">
                            管理你的装备，打造最强角色 - 支持 NFT 标准装备
                        </p>
                    </div>

                    {/* 钱包连接状态 */}
                    <div className="flex items-center gap-4">
                        {wallet ? (
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="text-center sm:text-right">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        已连接钱包
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {wallet.publicKey?.toString().slice(0, 8)}...{wallet.publicKey?.toString().slice(-8)}
                                    </div>
                                </div>
                                <Link
                                    href="/mint-page"
                                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-semibold hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg"
                                >
                                    🎨 铸造装备
                                </Link>
                                <button
                                    onClick={disconnectWallet}
                                    className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full font-medium hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg"
                                >
                                    断开连接
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={connectWallet}
                                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                🔗 连接钱包
                            </button>
                        )}
                    </div>
                </div>

                {/* 销毁状态显示 */}
                {mintStatus && (
                    <div className={`max-w-2xl mx-auto mb-6 p-4 rounded-xl text-center backdrop-blur-sm border ${mintStatus.includes('成功')
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800'
                        : mintStatus.includes('失败') || mintStatus.includes('❌')
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                        }`}>
                        <div className="text-lg mb-2">
                            {mintStatus.includes('成功') ? '🎉' :
                                mintStatus.includes('失败') || mintStatus.includes('❌') ? '❌' : '⏳'}
                        </div>
                        <p className="text-sm whitespace-pre-line">{mintStatus}</p>
                    </div>
                )}

                {wallet ? (
                    <div className="max-w-7xl mx-auto">
                        {/* 角色展示区域 */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-xl mb-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* 左侧：火柴人角色 */}
                                <div className="lg:col-span-1 flex flex-col items-center justify-center">
                                    <div className="relative w-64 h-64 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl border-4 border-gray-300 dark:border-gray-600 flex items-center justify-center mb-6">
                                        {/* 火柴人基础图形 */}
                                        <div className="relative">
                                            {/* 头部 */}
                                            <div className="w-16 h-16 bg-gray-300 dark:bg-gray-500 rounded-full mx-auto mb-4 relative">
                                                {/* 饰品位置 */}
                                                {characterStats.equipped.accessory && (
                                                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                                                        <img
                                                            src={characterStats.equipped.accessory.image}
                                                            alt="饰品"
                                                            className="w-8 h-8 rounded-lg shadow-lg"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* 身体 */}
                                            <div className="w-8 h-20 bg-gray-400 dark:bg-gray-600 mx-auto relative">
                                                {/* 护甲位置 */}
                                                {characterStats.equipped.armor && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <img
                                                            src={characterStats.equipped.armor.image}
                                                            alt="护甲"
                                                            className="w-12 h-16 rounded-lg shadow-lg"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* 手臂 */}
                                            <div className="flex justify-between -mt-16 px-4">
                                                <div className="w-2 h-16 bg-gray-400 dark:bg-gray-600 transform -rotate-45 origin-bottom"></div>
                                                <div className="w-2 h-16 bg-gray-400 dark:bg-gray-600 transform rotate-45 origin-bottom"></div>
                                            </div>

                                            {/* 腿部 */}
                                            <div className="flex justify-between mt-4 px-6">
                                                <div className="w-2 h-16 bg-gray-400 dark:bg-gray-600 transform -rotate-12 origin-top"></div>
                                                <div className="w-2 h-16 bg-gray-400 dark:bg-gray-600 transform rotate-12 origin-top"></div>
                                            </div>

                                            {/* 武器位置 */}
                                            {characterStats.equipped.weapon && (
                                                <div className="absolute -right-4 top-8 transform rotate-45">
                                                    <img
                                                        src={characterStats.equipped.weapon.image}
                                                        alt="武器"
                                                        className="w-12 h-12 rounded-lg shadow-lg"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">冒险者</h3>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {characterStats.equipped.weapon && (
                                                <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm">
                                                    武器: {characterStats.equipped.weapon.name}
                                                </span>
                                            )}
                                            {characterStats.equipped.armor && (
                                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                                                    护甲: {characterStats.equipped.armor.name}
                                                </span>
                                            )}
                                            {characterStats.equipped.accessory && (
                                                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                                                    饰品: {characterStats.equipped.accessory.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 右侧：角色属性 */}
                                <div className="lg:col-span-2">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">角色属性</h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* 基础属性 */}
                                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                                            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">基础属性</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-300">生命值:</span>
                                                    <span className="font-bold text-green-700 dark:text-green-300">
                                                        {getStatDisplay(characterStats.total.health)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-300">魔法值:</span>
                                                    <span className="font-bold text-blue-700 dark:text-blue-300">
                                                        {getStatDisplay(characterStats.total.mana)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-300">攻击力:</span>
                                                    <span className="font-bold text-red-700 dark:text-red-300">
                                                        {getStatDisplay(characterStats.total.attack)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-300">防御力:</span>
                                                    <span className="font-bold text-yellow-700 dark:text-yellow-300">
                                                        {getStatDisplay(characterStats.total.defense)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-300">速度:</span>
                                                    <span className="font-bold text-purple-700 dark:text-purple-300">
                                                        {getStatDisplay(characterStats.total.speed)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 稀有属性 */}
                                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                                            <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-4">稀有属性</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-300">暴击率:</span>
                                                    <span className="font-bold text-orange-700 dark:text-orange-300">
                                                        {getStatDisplay(characterStats.total.critRate, true)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-300">暴击伤害:</span>
                                                    <span className="font-bold text-orange-700 dark:text-orange-300">
                                                        {getStatDisplay(characterStats.total.critDamage, true)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-300">吸血:</span>
                                                    <span className="font-bold text-red-700 dark:text-red-300">
                                                        {getStatDisplay(characterStats.total.lifeSteal, true)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-300">冷却缩减:</span>
                                                    <span className="font-bold text-blue-700 dark:text-blue-300">
                                                        {getStatDisplay(characterStats.total.cooldownReduction, true)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-300">闪避率:</span>
                                                    <span className="font-bold text-green-700 dark:text-green-300">
                                                        {getStatDisplay(characterStats.total.dodgeRate, true)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 属性加成说明 */}
                                    <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">属性说明</h4>
                                        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                                            <li>• 基础属性来自角色本身和装备加成</li>
                                            <li>• 稀有属性仅来自饰品装备</li>
                                            <li>• 每个装备槽位只能装备一件对应类型的装备</li>
                                            <li>• 支持 NFT 标准装备和旧版本装备</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* NFT 装备列表 */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-xl">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">我的装备 ({nfts.length})</h2>

                            {isLoading ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-gray-600 dark:text-gray-300">正在加载装备...</p>
                                </div>
                            ) : nfts.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-3xl">🎒</span>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">还没有装备</h3>
                                    <p className="text-gray-600 dark:text-gray-300 mb-6">去铸造一些装备来增强你的角色吧！</p>
                                    <Link
                                        href="/mint-page"
                                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-semibold hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        🎨 前往铸造装备
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {nfts.map((nft) => (
                                        <div
                                            key={nft.id}
                                            className={`bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-xl p-4 border-2 transition-all duration-300 ${nft.isEquipped
                                                ? 'border-green-500 shadow-lg scale-105'
                                                : 'border-gray-200 dark:border-gray-600 hover:border-blue-500 hover:shadow-md'
                                                }`}
                                        >
                                            {/* 装备图片 */}
                                            <div className="relative mb-4">
                                                <img
                                                    src={nft.image}
                                                    alt={nft.name}
                                                    className="w-full h-48 object-cover rounded-lg"
                                                    onError={(e) => {
                                                        // 图片加载失败时显示默认图片
                                                        e.currentTarget.src = '/api/placeholder/200/200'
                                                    }}
                                                />
                                                {nft.isEquipped && (
                                                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                                                        已装备
                                                    </div>
                                                )}
                                            </div>

                                            {/* 装备信息 */}
                                            <div className="space-y-2">
                                                <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">
                                                    {nft.name}
                                                </h3>

                                                <div className="flex justify-between items-center text-sm">
                                                    <span className={`font-semibold ${getTypeColor(nft.type)}`}>
                                                        {nft.type}
                                                    </span>
                                                    <span className={`font-bold ${getRarityColor(nft.rarity)}`}>
                                                        {nft.rarityName}
                                                    </span>
                                                </div>

                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    词条: {nft.trait}
                                                </div>

                                                {/* 装备属性预览 */}
                                                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 text-xs">
                                                    <div className="grid grid-cols-2 gap-1">
                                                        <div>攻击: {getStatDisplay(nft.stats.baseStats.attack)}</div>
                                                        <div>防御: {getStatDisplay(nft.stats.baseStats.defense)}</div>
                                                        <div>生命: {getStatDisplay(nft.stats.baseStats.health)}</div>
                                                        <div>速度: {getStatDisplay(nft.stats.baseStats.speed)}</div>
                                                    </div>
                                                    {nft.stats.rareStats && (
                                                        <div className="mt-1 pt-1 border-t border-gray-300 dark:border-gray-600 grid grid-cols-2 gap-1">
                                                            <div>暴击: {getStatDisplay(nft.stats.rareStats.critRate, true)}</div>
                                                            <div>吸血: {getStatDisplay(nft.stats.rareStats.lifeSteal, true)}</div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 操作按钮 */}
                                                <div className="flex gap-2 mt-3">
                                                    {nft.isEquipped ? (
                                                        <button
                                                            onClick={() => unequipItem(nft)}
                                                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            脱下
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => equipItem(nft)}
                                                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            装备
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => burnNFT(nft)}
                                                        className="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        销毁
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // 未连接钱包提示
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20 shadow-xl">
                        <div className="max-w-md mx-auto">
                            <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-3xl">🔐</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                连接钱包查看角色
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                                连接你的 Phantom 钱包来查看和管理你的装备，打造最强角色！
                            </p>

                            <button
                                onClick={connectWallet}
                                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg"
                            >
                                🔗 连接 Phantom 钱包
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}