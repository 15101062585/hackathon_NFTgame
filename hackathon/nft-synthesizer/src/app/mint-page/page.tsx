'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js'
import Link from 'next/link'

interface Wallet {
  publicKey: PublicKey
  signTransaction: (transaction: any) => Promise<any>
  signAllTransactions: (transactions: any[]) => Promise<any[]>
}

// 装备名称生成器
const traits = {
  common: ['坚韧', '锋利', '灵巧', '厚重', '疾风', '治愈'],
  uncommon: ['狼牙', '猎鹰', '巨熊', '毒蛇', '野猪', '猎豹'],
  rare: ['烈焰', '冰霜', '雷霆', '暗影', '圣光', '自然'],
  epic: ['龙裔', '凤凰', '泰坦', '虚空', '星辰', '亡灵'],
  legendary: ['永恒', '混沌', '创世', '时空', '深渊', '量子'],
  mythic: ['神灭', '天道', '轮回', '归一', '造化', '不朽']
};

const weaponTypes = ['长剑', '战斧', '法杖', '匕首', '弓箭', '战锤', '双刃剑', '长矛', '拳套'];
const armorTypes = ['皮甲', '布衣', '斗篷', '板甲', '法衣', '轻甲', '重甲'];
const accessoryTypes = ['戒指', '项链', '耳环', '护符', '手镯', '徽章', '吊坠', '头冠', '勋章'];
const allEquipmentTypes = [...weaponTypes, ...armorTypes, ...accessoryTypes];

// 稀有度配置
const rarityConfig = {
  common: {
    name: '普通',
    color: '#969696',
    bgGradient: ['#c0c0c0', '#a0a0a0'],
    borderColor: '#808080',
    glow: false,
    complexity: 1
  },
  uncommon: {
    name: '精良',
    color: '#2ecc71',
    bgGradient: ['#27ae60', '#2ecc71'],
    borderColor: '#229954',
    glow: true,
    glowColor: '#27ae60',
    complexity: 2
  },
  rare: {
    name: '稀有',
    color: '#3498db',
    bgGradient: ['#2980b9', '#3498db'],
    borderColor: '#2471a3',
    glow: true,
    glowColor: '#2980b9',
    complexity: 3
  },
  epic: {
    name: '珍稀',
    color: '#9b59b6',
    bgGradient: ['#8e44ad', '#9b59b6'],
    borderColor: '#7d3c98',
    glow: true,
    glowColor: '#8e44ad',
    complexity: 4
  },
  legendary: {
    name: '史诗',
    color: '#e74c3c',
    bgGradient: ['#c0392b', '#e74c3c'],
    borderColor: '#a93226',
    glow: true,
    glowColor: '#c0392b',
    complexity: 5
  },
  mythic: {
    name: '传说',
    color: '#f1c40f',
    bgGradient: ['#f39c12', '#f1c40f'],
    borderColor: '#d68910',
    glow: true,
    glowColor: '#f39c12',
    complexity: 6
  }
};

// 装备类型图标映射
const equipmentIcons: { [key: string]: string } = {
  // 武器
  '长剑': '⚔️', '战斧': '🪓', '法杖': '🪄', '匕首': '🗡️', '弓箭': '🏹',
  '战锤': '🔨', '双刃剑': '⚔️', '长矛': '🔱', '拳套': '🥊',
  // 防具
  '皮甲': '🧥', '布衣': '👕', '斗篷': '🧣', '板甲': '🛡️', '法衣': '👘',
  '轻甲': '🥋', '重甲': '🦺',
  // 饰品
  '戒指': '💍', '项链': '📿', '耳环': '📯', '护符': '🔮', '手镯': '📿',
  '徽章': '🎖️', '吊坠': '⛓️', '头冠': '👑', '勋章': '🎗️'
};

// 属性类型定义
interface BaseStats {
  health: number;      // 生命值
  mana: number;        // 魔法值
  attack: number;      // 攻击力
  defense: number;     // 防御力
  speed: number;       // 速度
}

interface RareStats {
  critRate: number;        // 暴击率 (%)
  critDamage: number;      // 暴击伤害 (%)
  lifeSteal: number;       // 吸血 (%)
  cooldownReduction: number; // 冷却缩减 (%)
  dodgeRate: number;       // 闪避率 (%)
}

interface EquipmentStats {
  baseStats: BaseStats;
  rareStats?: RareStats;
  description: string;
}

// 稀有度加成配置
const rarityMultipliers = {
  common: { multiplier: 0.10, rareMultiplier: 0.02 },      // 10% 普通属性，2% 稀有属性
  uncommon: { multiplier: 0.20, rareMultiplier: 0.05 },    // 20% 普通属性，5% 稀有属性
  rare: { multiplier: 0.30, rareMultiplier: 0.08 },        // 30% 普通属性，8% 稀有属性
  epic: { multiplier: 0.40, rareMultiplier: 0.12 },        // 40% 普通属性，12% 稀有属性
  legendary: { multiplier: 0.50, rareMultiplier: 0.15 },   // 50% 普通属性，15% 稀有属性
  mythic: { multiplier: 0.60, rareMultiplier: 0.20 }       // 60% 普通属性，20% 稀有属性
};

// 武器类型攻击方式映射
const weaponAttackTypes = {
  '长剑': '快速斩击',
  '战斧': '重劈',
  '法杖': '魔法攻击',
  '匕首': '快速刺击',
  '弓箭': '远程射击',
  '战锤': '重击',
  '双刃剑': '连续斩击',
  '长矛': '突刺',
  '拳套': '快速连打'
};

// 基础属性范围
const baseStatRanges = {
  health: { min: 50, max: 200 },
  mana: { min: 30, max: 150 },
  attack: { min: 5, max: 50 },
  defense: { min: 3, max: 40 },
  speed: { min: 1, max: 20 }
};

// 生成随机数在范围内
function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 生成装备名称的函数
function generateEquipmentName(rarity = 'common', specificType = null) {
  const rarityTraits = traits[rarity] || traits.common;
  const randomTrait = rarityTraits[Math.floor(Math.random() * rarityTraits.length)];

  let equipmentType;
  if (specificType && allEquipmentTypes.includes(specificType)) {
    equipmentType = specificType;
  } else {
    equipmentType = allEquipmentTypes[Math.floor(Math.random() * allEquipmentTypes.length)];
  }

  return {
    name: `${randomTrait}${equipmentType}`,
    trait: randomTrait,
    type: equipmentType,
    rarity: rarity,
    rarityName: rarityConfig[rarity].name,
    icon: equipmentIcons[equipmentType] || '⚔️'
  };
}

// 辅助函数：随机选择属性
function getRandomStats(count: number, availableStats: string[]): string[] {
  const shuffled = [...availableStats].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// 辅助函数：获取属性名称
function getStatNames(stats: string[]): string {
  const statNames: { [key: string]: string } = {
    'health': '生命值',
    'mana': '魔法值',
    'attack': '攻击力',
    'defense': '防御力',
    'speed': '速度'
  };

  return stats.map(stat => statNames[stat] || stat).join('、');
}

// 生成装备属性
function generateEquipmentStats(equipment: any): EquipmentStats {
  const { rarity, type, trait } = equipment;
  const config = rarityMultipliers[rarity];
  const isWeapon = weaponTypes.includes(type);
  const isAccessory = accessoryTypes.includes(type);
  const isArmor = armorTypes.includes(type);

  let baseStats: BaseStats = {
    health: getRandomInRange(baseStatRanges.health.min, baseStatRanges.health.max),
    mana: getRandomInRange(baseStatRanges.mana.min, baseStatRanges.mana.max),
    attack: getRandomInRange(baseStatRanges.attack.min, baseStatRanges.attack.max),
    defense: getRandomInRange(baseStatRanges.defense.min, baseStatRanges.defense.max),
    speed: getRandomInRange(baseStatRanges.speed.min, baseStatRanges.speed.max)
  };

  let rareStats: RareStats | undefined;
  let description = '';

  // 根据稀有度调整属性
  switch (rarity) {
    case 'common':
      // 普通：增加两项一般属性，少量减少一项基础属性 或 少量增加三项基本属性
      if (Math.random() > 0.5) {
        // 方案1：增加两项，减少一项
        const increaseStats = getRandomStats(2, ['health', 'mana', 'attack', 'defense', 'speed']);
        const decreaseStat = getRandomStats(1, ['health', 'mana', 'defense', 'speed'])[0]; // 武器不减攻击力

        increaseStats.forEach(stat => {
          baseStats[stat] = Math.floor(baseStats[stat] * (1 + config.multiplier * 0.8));
        });

        if (!isWeapon || decreaseStat !== 'attack') {
          baseStats[decreaseStat] = Math.floor(baseStats[decreaseStat] * (1 - config.multiplier * 0.3));
        }

        description = `这件${equipment.rarityName}${equipment.type}略微提升了${getStatNames(increaseStats)}，但${getStatNames([decreaseStat])}有所降低。`;
      } else {
        // 方案2：少量增加三项
        const increaseStats = getRandomStats(3, ['health', 'mana', 'attack', 'defense', 'speed']);
        increaseStats.forEach(stat => {
          baseStats[stat] = Math.floor(baseStats[stat] * (1 + config.multiplier * 0.5));
        });
        description = `这件${equipment.rarityName}${equipment.type}略微提升了${getStatNames(increaseStats)}。`;
      }
      break;

    case 'uncommon':
      // 精良：一般减少一项基本属性，中等提升两项基础属性 或 一般增加三项基本属性
      if (Math.random() > 0.5) {
        const decreaseStat = getRandomStats(1, ['health', 'mana', 'defense', 'speed'])[0];
        const increaseStats = getRandomStats(2, ['health', 'mana', 'attack', 'defense', 'speed']);

        if (!isWeapon || decreaseStat !== 'attack') {
          baseStats[decreaseStat] = Math.floor(baseStats[decreaseStat] * (1 - config.multiplier * 0.4));
        }

        increaseStats.forEach(stat => {
          baseStats[stat] = Math.floor(baseStats[stat] * (1 + config.multiplier));
        });

        description = `这件${equipment.rarityName}${equipment.type}显著提升了${getStatNames(increaseStats)}，但${getStatNames([decreaseStat])}有所下降。`;
      } else {
        const increaseStats = getRandomStats(3, ['health', 'mana', 'attack', 'defense', 'speed']);
        increaseStats.forEach(stat => {
          baseStats[stat] = Math.floor(baseStats[stat] * (1 + config.multiplier * 0.7));
        });
        description = `这件${equipment.rarityName}${equipment.type}均衡地提升了${getStatNames(increaseStats)}。`;
      }
      break;

    case 'rare':
      // 稀有：中等提升三项属性
      const rareIncreaseStats = getRandomStats(3, ['health', 'mana', 'attack', 'defense', 'speed']);
      rareIncreaseStats.forEach(stat => {
        baseStats[stat] = Math.floor(baseStats[stat] * (1 + config.multiplier));
      });
      description = `这件${equipment.rarityName}${equipment.type}显著提升了${getStatNames(rareIncreaseStats)}。`;
      break;

    case 'epic':
      // 珍稀：大量提升两项属性
      const epicIncreaseStats = getRandomStats(2, ['health', 'mana', 'attack', 'defense', 'speed']);
      epicIncreaseStats.forEach(stat => {
        baseStats[stat] = Math.floor(baseStats[stat] * (1 + config.multiplier * 1.5));
      });
      description = `这件${equipment.rarityName}${equipment.type}极大地提升了${getStatNames(epicIncreaseStats)}。`;
      break;

    case 'legendary':
      // 史诗：巨量提升具体两项属性
      const legendaryIncreaseStats = getRandomStats(2, ['health', 'mana', 'attack', 'defense', 'speed']);
      legendaryIncreaseStats.forEach(stat => {
        baseStats[stat] = Math.floor(baseStats[stat] * (1 + config.multiplier * 2));
      });
      description = `这件${equipment.rarityName}${equipment.type}以惊人的幅度提升了${getStatNames(legendaryIncreaseStats)}。`;
      break;

    case 'mythic':
      // 传说：巨量提升三到四项属性
      const mythicIncreaseStats = getRandomStats(3 + Math.floor(Math.random() * 2), ['health', 'mana', 'attack', 'defense', 'speed']);
      mythicIncreaseStats.forEach(stat => {
        baseStats[stat] = Math.floor(baseStats[stat] * (1 + config.multiplier * 2.5));
      });
      description = `这件${equipment.rarityName}${equipment.type}以传说级的幅度提升了${getStatNames(mythicIncreaseStats)}。`;
      break;
  }

  // 武器特殊处理：确保攻击力不减少，并根据武器类型调整
  if (isWeapon) {
    const attackType = weaponAttackTypes[type] || '物理攻击';
    baseStats.attack = Math.floor(baseStats.attack * (1 + config.multiplier * 1.2)); // 武器额外攻击加成
    description += ` 使用${attackType}方式战斗。`;
  }

  // 饰品特殊处理：添加稀有属性
  if (isAccessory) {
    rareStats = {
      critRate: Math.floor(config.rareMultiplier * 10000) / 100, // 转换为百分比
      critDamage: Math.floor(config.rareMultiplier * 15000) / 100,
      lifeSteal: Math.floor(config.rareMultiplier * 8000) / 100,
      cooldownReduction: Math.floor(config.rareMultiplier * 6000) / 100,
      dodgeRate: Math.floor(config.rareMultiplier * 5000) / 100
    };
    description += ` 这件饰品还提供了稀有属性的加成。`;
  }

  // 根据词条调整特定属性
  description += applyTraitEffects(baseStats, rareStats, trait, rarity);

  return { baseStats, rareStats, description };
}

// 应用词条效果
function applyTraitEffects(baseStats: BaseStats, rareStats: RareStats | undefined, trait: string, rarity: string): string {
  const config = rarityMultipliers[rarity];
  let effectDescription = '';

  const traitEffects: { [key: string]: { stat: keyof BaseStats | keyof RareStats, multiplier: number } } = {
    // 普通词条
    '坚韧': { stat: 'health', multiplier: 1.2 },
    '锋利': { stat: 'attack', multiplier: 1.15 },
    '灵巧': { stat: 'speed', multiplier: 1.2 },
    '厚重': { stat: 'defense', multiplier: 1.2 },
    '疾风': { stat: 'speed', multiplier: 1.25 },
    '治愈': { stat: 'health', multiplier: 1.1 },

    // 精良词条
    '狼牙': { stat: 'attack', multiplier: 1.3 },
    '猎鹰': { stat: 'speed', multiplier: 1.35 },
    '巨熊': { stat: 'health', multiplier: 1.4 },
    '毒蛇': { stat: 'attack', multiplier: 1.25 },
    '野猪': { stat: 'defense', multiplier: 1.3 },
    '猎豹': { stat: 'speed', multiplier: 1.4 },

    // 稀有词条
    '烈焰': { stat: 'attack', multiplier: 1.5 },
    '冰霜': { stat: 'defense', multiplier: 1.5 },
    '雷霆': { stat: 'speed', multiplier: 1.6 },
    '暗影': { stat: 'critRate', multiplier: 1.8 },
    '圣光': { stat: 'health', multiplier: 1.6 },
    '自然': { stat: 'mana', multiplier: 1.5 },

    // 珍稀词条
    '龙裔': { stat: 'attack', multiplier: 1.8 },
    '凤凰': { stat: 'health', multiplier: 1.8 },
    '泰坦': { stat: 'defense', multiplier: 1.8 },
    '虚空': { stat: 'critDamage', multiplier: 2.0 },
    '星辰': { stat: 'mana', multiplier: 1.8 },
    '亡灵': { stat: 'lifeSteal', multiplier: 2.0 },

    // 史诗词条
    '永恒': { stat: 'health', multiplier: 2.0 },
    '混沌': { stat: 'attack', multiplier: 2.0 },
    '创世': { stat: 'defense', multiplier: 2.0 },
    '时空': { stat: 'speed', multiplier: 2.2 },
    '深渊': { stat: 'critRate', multiplier: 2.5 },
    '量子': { stat: 'cooldownReduction', multiplier: 2.5 },

    // 传说词条
    '神灭': { stat: 'attack', multiplier: 2.5 },
    '天道': { stat: 'health', multiplier: 2.5 },
    '轮回': { stat: 'defense', multiplier: 2.5 },
    '归一': { stat: 'speed', multiplier: 2.8 },
    '造化': { stat: 'critDamage', multiplier: 3.0 },
    '不朽': { stat: 'dodgeRate', multiplier: 3.0 }
  };

  const effect = traitEffects[trait];
  if (effect) {
    if (effect.stat in baseStats) {
      const statKey = effect.stat as keyof BaseStats;
      baseStats[statKey] = Math.floor(baseStats[statKey] * effect.multiplier);
    } else if (rareStats && effect.stat in rareStats) {
      const statKey = effect.stat as keyof RareStats;
      rareStats[statKey] = Math.floor(rareStats[statKey] * effect.multiplier * 100) / 100;
    }

    const statNames: { [key: string]: string } = {
      'health': '生命值',
      'mana': '魔法值',
      'attack': '攻击力',
      'defense': '防御力',
      'speed': '速度',
      'critRate': '暴击率',
      'critDamage': '暴击伤害',
      'lifeSteal': '吸血',
      'cooldownReduction': '冷却缩减',
      'dodgeRate': '闪避率'
    };

    effectDescription = ` ${trait}词条显著增强了${statNames[effect.stat]}。`;
  }

  return effectDescription;
}

// 将属性转换为 Metaplex 标准格式
function statsToMetadata(stats: EquipmentStats, equipment: any) {
  const attributes: { trait_type: string; value: any; display_type?: string }[] = [];

  // 添加基础属性
  Object.entries(stats.baseStats).forEach(([key, value]) => {
    const traitNames: { [key: string]: string } = {
      'health': '生命值',
      'mana': '魔法值',
      'attack': '攻击力',
      'defense': '防御力',
      'speed': '速度'
    };

    attributes.push({
      trait_type: traitNames[key] || key,
      value: value,
      display_type: 'number' // 明确指定数字类型
    });
  });

  // 添加稀有属性（仅饰品）
  if (stats.rareStats) {
    Object.entries(stats.rareStats).forEach(([key, value]) => {
      const traitNames: { [key: string]: string } = {
        'critRate': '暴击率',
        'critDamage': '暴击伤害',
        'lifeSteal': '吸血',
        'cooldownReduction': '冷却缩减',
        'dodgeRate': '闪避率'
      };

      attributes.push({
        trait_type: traitNames[key] || key,
        value: value,
        display_type: 'number'
      });
    });
  }

  // 添加装备基本信息
  attributes.push(
    { 
      trait_type: '装备类型', 
      value: equipment.type 
    },
    { 
      trait_type: '词条', 
      value: equipment.trait 
    },
    { 
      trait_type: '稀有度', 
      value: equipment.rarityName 
    },
    { 
      trait_type: '品质等级', 
      value: equipment.rarity,
      display_type: 'number'
    }
  );

  // 如果是武器，添加攻击方式
  if (weaponTypes.includes(equipment.type)) {
    attributes.push({
      trait_type: '攻击方式',
      value: weaponAttackTypes[equipment.type] || '物理攻击'
    });
  }

  return attributes;
}

// 按照 Metaplex 标准生成完整的元数据
function generateMetaplexMetadata(equipment: any, stats: EquipmentStats, imageUri: string, walletPublicKey?: PublicKey) {
  const attributes = statsToMetadata(stats, equipment);
  
  // 完整的 Metaplex 标准元数据
  const metadata = {
    name: equipment.name,
    symbol: 'EQUIP',
    description: `${stats.description} 这是一件${equipment.rarityName}品质的${equipment.type}，蕴含着${equipment.trait}的力量。`,
    
    // 图片 URI - 必须字段
    image: imageUri,
    
    // 外部链接（可选）
    external_url: "https://your-app.com/equipment",
    
    // 属性数组 - Metaplex 标准
    attributes: attributes,
    
    // 属性分组 - 兼容性字段
    properties: {
      files: [
        {
          uri: imageUri,
          type: 'image/png'
        }
      ],
      category: 'image',
      creators: [
        {
          address: walletPublicKey?.toString() || "",
          share: 100
        }
      ]
    },
    
    // 集合信息（可选）
    collection: {
      name: "装备收藏系列",
      family: "游戏装备"
    },
    
    // 卖家费用基点（版税）
    seller_fee_basis_points: 500, // 5%
    
    // 创作者信息 - 必须字段
    creators: [
      {
        address: walletPublicKey?.toString() || "",
        verified: true, // 重要：必须设置为 true
        share: 100
      }
    ]
  };
  
  return metadata;
}

// 扩展 Window 接口以包含 solana
declare global {
  interface Window {
    solana?: any
  }
}

export default function MintPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [mintStatus, setMintStatus] = useState<string>('')

  // 装备相关状态
  const [equipmentRarity, setEquipmentRarity] = useState('common')
  const [equipmentType, setEquipmentType] = useState('random')
  const [generatedEquipment, setGeneratedEquipment] = useState<any>(null)
  const [generatedImage, setGeneratedImage] = useState<string>('')
  const [equipmentStats, setEquipmentStats] = useState<EquipmentStats | null>(null)
  const [metadataJson, setMetadataJson] = useState<string>('')

  // Canvas 引用
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 初始化连接
  const connection = useMemo(() => new Connection(clusterApiUrl('devnet')), [])

  // 动态创建 Metaplex 实例，确保使用正确的钱包
  const metaplex = useMemo(() => {
    const mx = Metaplex.make(connection)

    // 如果有钱包连接，使用钱包身份
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

        // 监听连接事件
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

        // 监听断开连接事件
        const handleDisconnect = () => {
          setWallet(null)
          setBalance(0)
        }

        phantomWallet.on('connect', handleConnect)
        phantomWallet.on('disconnect', handleDisconnect)

        // 检查是否已经连接
        if (phantomWallet.isConnected && phantomWallet.publicKey) {
          handleConnect()
        }

        // 清理函数
        return () => {
          phantomWallet.off('connect', handleConnect)
          phantomWallet.off('disconnect', handleDisconnect)
        }
      }
    }

    checkPhantomWallet()
  }, [])

  // 获取余额
  useEffect(() => {
    if (wallet?.publicKey) {
      fetchBalance()
    }
  }, [wallet])

  // 生成装备图片
  const generateEquipmentImage = (equipment: any) => {
    const canvas = canvasRef.current
    if (!canvas) return ''

    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    const width = 800
    const height = 800
    canvas.width = width
    canvas.height = height

    // 清除画布
    ctx.clearRect(0, 0, width, height)

    const rarity = rarityConfig[equipment.rarity]

    // 绘制背景渐变
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, rarity.bgGradient[0])
    gradient.addColorStop(1, rarity.bgGradient[1])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // 添加光晕效果
    if (rarity.glow) {
      ctx.shadowColor = rarity.glowColor
      ctx.shadowBlur = 30
    }

    // 绘制装备边框
    ctx.strokeStyle = rarity.borderColor
    ctx.lineWidth = 8
    ctx.strokeRect(20, 20, width - 40, height - 40)

    // 绘制内部装饰边框
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.strokeRect(40, 40, width - 80, height - 80)

    // 重置阴影
    ctx.shadowBlur = 0

    // 根据稀有度添加细节
    const complexity = rarity.complexity

    // 绘制装饰元素
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1

    // 稀有度越高，装饰越复杂
    for (let i = 0; i < complexity * 2; i++) {
      const angle = (i / (complexity * 2)) * Math.PI * 2
      const radius = 200 + (i % 2) * 50
      const x1 = width / 2 + Math.cos(angle) * radius
      const y1 = height / 2 + Math.sin(angle) * radius
      const x2 = width / 2 + Math.cos(angle + 0.1) * (radius + 20)
      const y2 = height / 2 + Math.sin(angle + 0.1) * (radius + 20)

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    // 绘制中心圆形背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, 120, 0, Math.PI * 2)
    ctx.fill()

    // 绘制装备图标
    ctx.font = `bold ${80 + complexity * 10}px Arial`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(equipment.icon, width / 2, height / 2 - 20)

    // 绘制装备名称
    ctx.font = `bold ${32 + complexity * 2}px Arial`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(equipment.name, width / 2, height / 2 + 80)

    // 绘制稀有度标识
    ctx.font = `bold ${24 + complexity}px Arial`
    ctx.fillStyle = rarity.color
    ctx.fillText(`${rarity.name}品质`, width / 2, height / 2 + 120)

    // 绘制装备类型
    ctx.font = `bold ${20 + complexity}px Arial`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillText(equipment.type, width / 2, height / 2 + 150)

    // 绘制词条特效
    if (complexity >= 3) {
      ctx.font = `italic ${18 + complexity}px Arial`
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.fillText(`蕴含${equipment.trait}之力`, width / 2, height / 2 + 180)
    }

    // 添加高级效果（传说品质）
    if (complexity >= 6) {
      // 绘制星光效果
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        const radius = 280
        const x = width / 2 + Math.cos(angle) * radius
        const y = height / 2 + Math.sin(angle) * radius

        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()

        // 绘制星光射线
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(width / 2, height / 2)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
    }

    // 转换为 Data URL
    return canvas.toDataURL('image/png')
  }

  // 生成装备名称和图片
  const generateEquipment = () => {
    const equipment = generateEquipmentName(
      equipmentRarity,
      equipmentType === 'random' ? null : equipmentType
    );

    // 生成装备属性
    const stats = generateEquipmentStats(equipment);

    setGeneratedEquipment(equipment);
    setEquipmentStats(stats);

    // 生成装备图片
    const imageDataUrl = generateEquipmentImage(equipment);
    setGeneratedImage(imageDataUrl);

    // 生成元数据 JSON
    const metadata = generateMetaplexMetadata(equipment, stats, "ipfs://[将会在铸造时替换为实际图片哈希]", wallet?.publicKey);
    setMetadataJson(JSON.stringify(metadata, null, 2));
  }

  const fetchBalance = async () => {
    if (!wallet?.publicKey) return

    try {
      const balance = await connection.getBalance(wallet.publicKey)
      setBalance(balance / LAMPORTS_PER_SOL)
    } catch (error) {
      console.error('获取余额失败:', error)
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

  // Data URL 转换为 Blob
  const dataURLtoBlob = (dataURL: string): Blob => {
    const byteString = atob(dataURL.split(',')[1])
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    return new Blob([ab], { type: mimeString })
  }

  // 上传生成的图片到 IPFS
  const uploadGeneratedImageToIPFS = async (): Promise<string> => {
    try {
      setMintStatus('正在上传生成的装备图片到 IPFS...')

      const blob = dataURLtoBlob(generatedImage)
      const file = new File([blob], `${generatedEquipment.name}.png`, { type: 'image/png' })

      const formData = new FormData()
      formData.append('file', file)

      // 添加 Pinata 元数据
      const pinataMetadata = JSON.stringify({
        name: generatedEquipment.name,
        keyvalues: {
          description: equipmentStats?.description || '装备描述',
          creator: wallet?.publicKey?.toString() || 'unknown',
          equipmentType: generatedEquipment?.type || 'unknown',
          equipmentTrait: generatedEquipment?.trait || 'unknown',
          rarity: generatedEquipment?.rarity || 'unknown'
        }
      })
      formData.append('pinataMetadata', pinataMetadata)

      // 添加 Pinata 选项
      const pinataOptions = JSON.stringify({
        cidVersion: 0,
      })
      formData.append('pinataOptions', pinataOptions)

      // 使用 Pinata API 上传
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`上传图片到 IPFS 失败: ${response.status} ${errorData}`)
      }

      const data = await response.json()
      console.log('图片上传成功:', data)
      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`
    } catch (error) {
      console.error('IPFS 上传错误:', error)
      throw new Error('图片上传失败，请重试')
    }
  }

  // 上传元数据到 IPFS
  const uploadMetadataToIPFS = async (metadata: any): Promise<string> => {
    try {
      setMintStatus('正在上传元数据到 IPFS...')

      // 使用正确的 Pinata API 格式
      const requestBody = {
        pinataMetadata: {
          name: `${generatedEquipment.name} - Metadata`,
          keyvalues: {
            type: 'nft-metadata',
            creator: wallet?.publicKey?.toString() || 'unknown',
            equipmentType: generatedEquipment?.type || 'unknown',
            equipmentRarity: generatedEquipment?.rarity || 'unknown'
          }
        },
        pinataContent: metadata
      }

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`上传元数据到 IPFS 失败: ${response.status} ${errorData}`)
      }

      const data = await response.json()
      console.log('元数据上传成功:', data)
      return data.IpfsHash
    } catch (error) {
      console.error('元数据上传错误:', error)
      throw new Error('元数据上传失败，请重试')
    }
  }

  // 添加销毁 NFT 的函数
  const burnNFT = async (mintAddress: string) => {
    if (!wallet?.publicKey) {
      alert('请先连接钱包')
      return
    }

    setIsLoading(true)
    setMintStatus('开始销毁 NFT...')

    try {
      const mintPublicKey = new PublicKey(mintAddress)
      
      // 使用 Metaplex 销毁 NFT
      const result = await metaplex.nfts().delete({
        mintAddress: mintPublicKey,
      })

      setMintStatus(`🗑️ NFT 销毁成功！\n已销毁: ${mintAddress}`)
      
      console.log('NFT 销毁结果:', result)
      
    } catch (error: any) {
      console.error('销毁 NFT 失败:', error)
      
      let errorMessage = error.message || '请重试'
      
      if (errorMessage.includes('user rejected')) {
        errorMessage = '用户拒绝了交易签名'
      } else if (errorMessage.includes('No account found')) {
        errorMessage = '未找到该 NFT，请检查地址是否正确'
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = '余额不足，无法支付销毁费用'
      }
      
      setMintStatus(`❌ 销毁失败: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 真实的 NFT 铸造函数 - 修复版
  const mintNFT = async () => {
    if (!wallet?.publicKey) {
      alert('请先连接钱包')
      return
    }

    if (!generatedEquipment || !generatedImage || !equipmentStats) {
      alert('请先生成装备')
      return
    }

    // 检查余额是否足够
    if (balance < 0.01) {
      alert('余额不足，请确保钱包中有足够的 SOL 进行铸造（至少 0.01 SOL）')
      return
    }

    setIsLoading(true)
    setMintStatus('开始铸造过程...')

    try {
      // 1. 上传生成的图片到 IPFS
      const imageUrl = await uploadGeneratedImageToIPFS()

      // 2. 创建符合 Metaplex 标准的元数据
      setMintStatus('创建 Metaplex 标准元数据...')

      // 使用新的元数据生成函数
      const metadata = generateMetaplexMetadata(generatedEquipment, equipmentStats, imageUrl, wallet.publicKey)

      setMintStatus('上传元数据到 IPFS...')
      const metadataHash = await uploadMetadataToIPFS(metadata)
      const metadataUri = `https://gateway.pinata.cloud/ipfs/${metadataHash}`

      console.log('元数据 URI:', metadataUri)
      console.log('完整元数据:', metadata)

      // 3. 在区块链上铸造 NFT
      setMintStatus('在区块链上铸造 NFT...')

      // 使用真实的 Metaplex 铸造，确保所有必填字段都正确
      const { nft } = await metaplex.nfts().create({
        uri: metadataUri,
        name: generatedEquipment.name,
        sellerFeeBasisPoints: 500, // 5% 版税
        creators: [
          {
            address: wallet.publicKey,
            share: 100
          }
        ],
        isMutable: true, // 设置为 true 以便后续更新
        symbol: 'EQUIP',
      }, {
        commitment: 'confirmed'
      })

      setMintStatus(`🎉 铸造成功！\nNFT 地址: ${nft.address.toString()}\n所有者: ${nft.updateAuthorityAddress.toString()}`)

      console.log('NFT 铸造详情:', {
        nft,
        metadataUri,
        owner: nft.updateAuthorityAddress.toString(),
        equipment: generatedEquipment,
        mintAddress: nft.address.toString()
      })

      // 刷新余额
      await fetchBalance()

    } catch (error: any) {
      console.error('铸造 NFT 失败:', error)

      let errorMessage = error.message || '请重试'

      // 提供更友好的错误信息
      if (errorMessage.includes('user rejected')) {
        errorMessage = '用户拒绝了交易签名'
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = '余额不足，请确保钱包中有足够的 SOL'
      } else if (errorMessage.includes('blockhash')) {
        errorMessage = '网络错误，请稍后重试'
      } else if (errorMessage.includes('creators')) {
        errorMessage = '创作者信息配置错误，请检查元数据'
      }

      setMintStatus(`❌ 铸造失败: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 font-sans">
      {/* 隐藏的 Canvas 用于生成图片 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <main className="container mx-auto min-h-screen px-4 py-8">
        {/* 头部 */}
        <div className="flex flex-col lg:flex-row justify-between items-center mb-12">
          <div className="text-center lg:text-left mb-6 lg:mb-0">
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">⚔️</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                NFT 装备铸造工坊
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300 max-w-md">
              生成并铸造属于你的独特装备 NFT
            </p>
          </div>

          {/* 钱包连接状态 */}
          <div className="flex items-center gap-4">
            {wallet ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-center sm:text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    余额: <span className="text-green-600">{balance.toFixed(4)} SOL</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {wallet.publicKey?.toString().slice(0, 8)}...{wallet.publicKey?.toString().slice(-8)}
                  </div>
                </div>
                <Link
                  href="/"
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-semibold hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  🔄 返回首页
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
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-semibold hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                🔗 连接钱包
              </button>
            )}
          </div>
        </div>
        <Link
          href="/character-page"
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg"
        >
          👤 查看角色
        </Link>
        <div className="max-w-6xl mx-auto">
          {/* 铸造表单 */}
          {wallet ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 左侧：装备生成器 */}
                <div className="lg:col-span-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    装备生成器
                  </h2>

                  <div className="space-y-6">
                    {/* 稀有度选择 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        装备稀有度
                      </label>
                      <select
                        value={equipmentRarity}
                        onChange={(e) => setEquipmentRarity(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      >
                        <option value="common">普通</option>
                        <option value="uncommon">精良</option>
                        <option value="rare">稀有</option>
                        <option value="epic">珍稀</option>
                        <option value="legendary">史诗</option>
                        <option value="mythic">传说</option>
                      </select>
                    </div>

                    {/* 装备类型选择 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        装备类型
                      </label>
                      <select
                        value={equipmentType}
                        onChange={(e) => setEquipmentType(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      >
                        <option value="random">随机类型</option>
                        <optgroup label="武器">
                          {weaponTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </optgroup>
                        <optgroup label="防具">
                          {armorTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </optgroup>
                        <optgroup label="饰品">
                          {accessoryTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* 生成按钮 */}
                    <button
                      onClick={generateEquipment}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg"
                    >
                      🎲 生成装备
                    </button>

                    {/* 生成的装备信息 */}
                    {generatedEquipment && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                        <h4 className="font-bold text-green-800 dark:text-green-200 mb-2">
                          生成的装备
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">名称:</span>
                            <span className="font-semibold text-green-700 dark:text-green-300">{generatedEquipment.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">词条:</span>
                            <span className="font-semibold text-green-700 dark:text-green-300">{generatedEquipment.trait}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">类型:</span>
                            <span className="font-semibold text-green-700 dark:text-green-300">{generatedEquipment.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">稀有度:</span>
                            <span className="font-semibold text-green-700 dark:text-green-300">{generatedEquipment.rarityName}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 装备属性显示 */}
                    {equipmentStats && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mt-4">
                        <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-3">
                          装备属性
                        </h4>
                        <div className="space-y-2 text-sm">
                          {/* 基础属性 */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">生命值:</span>
                              <span className="font-semibold text-green-700 dark:text-green-300">{equipmentStats.baseStats.health}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">魔法值:</span>
                              <span className="font-semibold text-blue-700 dark:text-blue-300">{equipmentStats.baseStats.mana}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">攻击力:</span>
                              <span className="font-semibold text-red-700 dark:text-red-300">{equipmentStats.baseStats.attack}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">防御力:</span>
                              <span className="font-semibold text-yellow-700 dark:text-yellow-300">{equipmentStats.baseStats.defense}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">速度:</span>
                              <span className="font-semibold text-purple-700 dark:text-purple-300">{equipmentStats.baseStats.speed}</span>
                            </div>
                          </div>

                          {/* 稀有属性（仅饰品显示） */}
                          {equipmentStats.rareStats && (
                            <>
                              <div className="border-t border-blue-200 dark:border-blue-800 pt-2 mt-2">
                                <h5 className="font-semibold text-blue-700 dark:text-blue-300 mb-2 text-xs">稀有属性</h5>
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-300">暴击率:</span>
                                    <span className="font-semibold text-orange-600 dark:text-orange-400">{equipmentStats.rareStats.critRate}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-300">暴击伤害:</span>
                                    <span className="font-semibold text-orange-600 dark:text-orange-400">{equipmentStats.rareStats.critDamage}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-300">吸血:</span>
                                    <span className="font-semibold text-red-600 dark:text-red-400">{equipmentStats.rareStats.lifeSteal}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-300">冷却缩减:</span>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">{equipmentStats.rareStats.cooldownReduction}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-300">闪避率:</span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">{equipmentStats.rareStats.dodgeRate}%</span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 余额和费用信息 */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 text-sm">
                        费用信息
                      </h4>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        当前余额: {balance.toFixed(4)} SOL
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        预计铸造费用: ~0.01 - 0.02 SOL
                      </p>
                      {balance < 0.02 && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                          余额可能不足，请确保有足够的 SOL
                        </p>
                      )}
                    </div>

                    {/* 铸造按钮 */}
                    <button
                      onClick={mintNFT}
                      disabled={isLoading || !generatedEquipment}
                      className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>铸造中...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <span>⚔️</span>
                          <span>铸造装备 NFT</span>
                          <span>⚔️</span>
                        </div>
                      )}
                    </button>

                    {/* 铸造状态 */}
                    {mintStatus && (
                      <div className={`p-4 rounded-xl text-center backdrop-blur-sm border ${mintStatus.includes('成功')
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800'
                        : mintStatus.includes('失败')
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                        }`}>
                        <div className="text-lg mb-2">
                          {mintStatus.includes('成功') ? '🎉' :
                            mintStatus.includes('失败') ? '❌' : '⏳'}
                        </div>
                        <p className="text-sm whitespace-pre-line">{mintStatus}</p>
                        {mintStatus.includes('成功') && (
                          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                            <h4 className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                              管理 NFT
                            </h4>
                            <button
                              onClick={() => {
                                const mintAddress = mintStatus.split('NFT 地址: ')[1]?.split('\n')[0];
                                if (mintAddress) {
                                  if (confirm('确定要销毁这个 NFT 吗？此操作不可逆！')) {
                                    burnNFT(mintAddress);
                                  }
                                }
                              }}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                            >
                              🗑️ 销毁此 NFT
                            </button>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                              注意：销毁操作不可逆，将永久删除 NFT 并回收部分 SOL
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 中侧：生成的装备图片预览 */}
                <div className="lg:col-span-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    装备图片预览
                  </h2>

                  <div className="space-y-4">
                    {/* 图片预览区域 */}
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-4 text-center hover:border-green-400 dark:hover:border-green-500 transition-colors min-h-[400px] flex items-center justify-center">
                      {generatedImage ? (
                        <div className="w-full">
                          <img
                            src={generatedImage}
                            alt="生成的装备图片"
                            className="w-full h-auto rounded-xl shadow-lg"
                          />
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            装备图片已生成
                          </p>
                        </div>
                      ) : (
                        <div className="py-6 w-full">
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-xl">🎨</span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-1 text-sm">
                            点击左侧生成装备
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            系统将自动生成高级装备图片
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 图片信息 */}
                    {generatedImage && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 mb-1 text-sm">
                          图片信息
                        </h4>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          尺寸: 800 × 800 像素
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          格式: PNG
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          稀有度: {generatedEquipment?.rarityName}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧：元数据 JSON 预览 */}
                <div className="lg:col-span-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    元数据 JSON
                  </h2>

                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-4 min-h-[400px]">
                      {metadataJson ? (
                        <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-[350px]">
                          {metadataJson}
                        </pre>
                      ) : (
                        <div className="py-6 w-full text-center">
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-xl">📋</span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-1 text-sm">
                            点击左侧生成装备
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            系统将自动生成完整的元数据 JSON
                          </p>
                        </div>
                      )}
                    </div>

                    {metadataJson && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                        <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-1 text-sm">
                          元数据信息
                        </h4>
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          包含完整的装备属性和描述信息
                        </p>
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          符合 Metaplex 标准，确保可销毁
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
                  连接钱包开始铸造
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                  连接你的 Phantom 钱包来生成和铸造独一无二的装备 NFT。
                  将你的装备永久记录在区块链上！
                </p>

                <button
                  onClick={connectWallet}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  🔗 连接 Phantom 钱包
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 底部 */}
        <footer className="mt-16 text-center">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>Built with ❤️ using Next.js + Solana</span>
            </div>
            <div className="flex gap-6">
              <a
                href="https://nextjs.org/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Documentation
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://solana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Solana
              </a>
            </div>
          </div>
        </footer>
      </main >
    </div >
  )
}