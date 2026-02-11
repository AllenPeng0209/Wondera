export const RELATIONSHIP_STAGES = [
  {
    minAffectionLevel: 1,
    key: 'stranger',
    label: '陌生',
    promptHint: '保持礼貌克制，不用暧昧称呼，不要直接表白或过度亲昵。',
  },
  {
    minAffectionLevel: 2,
    key: 'familiar',
    label: '熟悉',
    promptHint: '语气更自然友好，适度关心，但仍保持分寸与距离感。',
  },
  {
    minAffectionLevel: 3,
    key: 'close',
    label: '亲近',
    promptHint: '更主动共情与关心，可以轻微调侃或撒娇，但不要油腻。',
  },
  {
    minAffectionLevel: 4,
    key: 'intimate',
    label: '亲密',
    promptHint: '可以用亲昵称呼、表达思念与占有欲，但保持克制与简短。',
  },
  {
    minAffectionLevel: 5,
    key: 'lover',
    label: '爱人',
    promptHint: '更浪漫直接，表达偏爱与承诺，但避免套路化的土味情话。',
  },
  {
    minAffectionLevel: 6,
    key: 'family',
    label: '家人',
    promptHint: '像家人一样可靠温柔，优先安抚与陪伴，少试探多理解。',
  },
];

export function getRelationshipStageByAffectionLevel(affectionLevel = 1) {
  const numeric = Number(affectionLevel);
  const safeLevel = Number.isFinite(numeric) ? Math.max(1, Math.floor(numeric)) : 1;
  let stage = RELATIONSHIP_STAGES[0];
  for (const candidate of RELATIONSHIP_STAGES) {
    if (safeLevel >= candidate.minAffectionLevel) stage = candidate;
  }
  return stage;
}

export function getRelationshipLabelByAffectionLevel(affectionLevel = 1) {
  return getRelationshipStageByAffectionLevel(affectionLevel).label;
}

