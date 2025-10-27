export const rarityLevels = {
  common: { name: '普通', next: 'uncommon', cost: 5 },
  uncommon: { name: '精良', next: 'rare', cost: 5 },
  rare: { name: '稀有', next: 'epic', cost: 5 },
  epic: { name: '珍稀', next: 'legendary', cost: 5 },
  legendary: { name: '史诗', next: 'mythic', cost: 5 },
  mythic: { name: '传说', next: null, cost: null }
};

export const traits = {
  common: ['坚韧', '锋利', '灵巧', '厚重', '疾风', '治愈'],
  uncommon: ['狼牙', '猎鹰', '巨熊', '毒蛇', '野猪', '猎豹'],
  rare: ['烈焰', '冰霜', '雷霆', '暗影', '圣光', '自然'],
  epic: ['龙裔', '凤凰', '泰坦', '虚空', '星辰', '亡灵'],
  legendary: ['永恒', '混沌', '创世', '时空', '深渊', '量子'],
  mythic: ['神灭', '天道', '轮回', '归一', '造化', '不朽']
};

export const weaponTypes = ['长剑', '战斧', '法杖', '匕首', '弓箭', '战锤', '双刃剑', '长矛', '拳套'];
export const armorTypes = ['皮甲', '布衣', '斗篷', '板甲', '法衣', '轻甲', '重甲'];
export const accessoryTypes = ['戒指', '项链', '耳环', '护符', '手镯', '徽章', '吊坠', '头冠', '勋章'];