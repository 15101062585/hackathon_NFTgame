// 装备词条数据
const traits = {
  common: ['坚韧', '锋利', '灵巧', '厚重', '疾风', '治愈'],
  uncommon: ['狼牙', '猎鹰', '巨熊', '毒蛇', '野猪', '猎豹'],
  rare: ['烈焰', '冰霜', '雷霆', '暗影', '圣光', '自然'],
  epic: ['龙裔', '凤凰', '泰坦', '虚空', '星辰', '亡灵'],
  legendary: ['永恒', '混沌', '创世', '时空', '深渊', '量子'],
  mythic: ['神灭', '天道', '轮回', '归一', '造化', '不朽']
};

// 装备类型
const weaponTypes = ['长剑', '战斧', '法杖', '匕首', '弓箭', '战锤', '双刃剑', '长矛', '拳套'];
const armorTypes = ['皮甲', '布衣', '斗篷', '板甲', '法衣', '轻甲', '重甲'];
const accessoryTypes = ['戒指', '项链', '耳环', '护符', '手镯', '徽章', '吊坠', '头冠', '勋章'];

// 所有装备类型合并
const allEquipmentTypes = [...weaponTypes, ...armorTypes, ...accessoryTypes];

/**
 * 生成装备名称
 * @param {string} rarity - 稀有度: common, uncommon, rare, epic, legendary, mythic
 * @param {string} specificType - 指定装备类型 (可选)
 * @returns {string} 装备名称
 */
export function generateEquipmentName(rarity = 'common', specificType = null) {
  // 获取对应稀有度的词条
  const rarityTraits = traits[rarity] || traits.common;
  
  // 随机选择一个词条
  const randomTrait = rarityTraits[Math.floor(Math.random() * rarityTraits.length)];
  
  // 选择装备类型
  let equipmentType;
  if (specificType && allEquipmentTypes.includes(specificType)) {
    equipmentType = specificType;
  } else {
    equipmentType = allEquipmentTypes[Math.floor(Math.random() * allEquipmentTypes.length)];
  }
  
  // 组合名称
  return `${randomTrait}${equipmentType}`;
}

/**
 * 批量生成装备名称
 * @param {number} count - 生成数量
 * @param {string} rarity - 稀有度
 * @returns {string[]} 装备名称数组
 */
export function generateMultipleEquipmentNames(count = 1, rarity = 'common') {
  const names = [];
  for (let i = 0; i < count; i++) {
    names.push(generateEquipmentName(rarity));
  }
  return names;
}

/**
 * 生成指定类型的装备名称
 * @param {string} equipmentType - 装备类型
 * @param {string} rarity - 稀有度
 * @returns {string} 装备名称
 */
export function generateSpecificTypeEquipmentName(equipmentType, rarity = 'common') {
  return generateEquipmentName(rarity, equipmentType);
}

// 导出数据供其他模块使用
export { traits, weaponTypes, armorTypes, accessoryTypes, allEquipmentTypes };