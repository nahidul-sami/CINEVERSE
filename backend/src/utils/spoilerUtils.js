const spoilerPatterns = [
  /\bspoilers?\b/i,
  /\b(?:plot|story)\s+twist\b/i,
  /\b(?:big|major|final|surprise|unexpected)\s+twist\b/i,
  /\b(?:final|ending|post[- ]credits?|after[- ]credits?)\s+(?:scene|reveal|sequence)\b/i,
  /\b(?:at|in|during)\s+the\s+(?:very\s+)?end\b/i,
  /\b(?:reveals?|revealed|discovers?|found out)\s+(?:that|who|the truth|to be)\b/i,
  /\b(?:turns out|it turns out)\s+(?:that|to be)?\b/i,
  /\b(?:secretly|all along)\s+(?:the\s+)?(?:killer|villain|traitor|spy|father|mother|identity)\b/i,
  /\b(?:the|a|an)\s+(?:killer|murderer|villain|traitor|spy)\s+(?:is|was|turns out to be)\b/i,
  /\b[\p{L}][\p{L}'-]{1,30}\s+(?:is|was)\s+(?:the\s+)?(?:killer|murderer|villain|traitor|spy)\b/iu,
  /\b[\p{L}][\p{L}'-]{1,30}\s+(?:is|was)\s+(?:actually|secretly|really)\s+(?:the\s+)?(?:killer|murderer|villain|traitor|spy|father|mother|son|daughter|brother|sister)\b/iu,
  /\b[\p{L}][\p{L}'-]{1,30}(?:'s|’s)\s+(?:father|mother|son|daughter|brother|sister|child|parent|twin)\s+(?:is|was)\b/iu,
  /\b(?:same person|secret identity|twin brother|twin sister|dead all along|was dead the whole time)\b/i,
  /\b[\p{L}][\p{L}'-]{1,30}\s+(?:dies?|is killed|was killed|gets killed|is murdered|was murdered|gets murdered|is shot|was shot)\b/iu,
  /\b[\p{L}][\p{L}'-]{1,30}\s+(?:kills?|murders?|betrays?)\s+[\p{L}][\p{L}'-]{1,30}\b/iu,
  /\b(?:ends? with|ending shows?|ending reveals?|finale reveals?)\b/i,
  /\b(?:survives?|escapes?|wins?|loses?|betrays?|returns?|sacrifices? (?:himself|herself|themselves)|marries|becomes king|becomes queen)\s+(?:at|in|during)\s+(?:the\s+)?(?:end|finale)\b/i,
  /\b(?:the\s+)?(?:final|ending|post[- ]credits?|after[- ]credits?)\s+(?:scene|reveal|sequence)\s+(?:shows?|reveals?|features?)\b/i,
];

const isSpoilerReview = (text) => {
  if (typeof text !== "string") return false;

  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalized) return false;

  return spoilerPatterns.some((pattern) => pattern.test(normalized));
};

module.exports = { isSpoilerReview };
