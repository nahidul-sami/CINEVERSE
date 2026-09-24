const spoilerPatterns = [
  /\bspoiler\b/i,
  /\bplot twist\b/i,
  /\bmajor twist\b/i,
  /\bfinal reveal\b/i,
  /\bending reveal\b/i,
  /\b(?:big|major|final|ending|surprise)\s+reveal\b/i,
  /\bat the end\b/i,
  /\bin the final scene\b/i,
  /\b(?:[a-z]+)\s+(?:dies?|gets killed|is actually|turns out to be|was the killer|was the villain)\s+(?:in|during|at|before)\b/i,
  /\b(?:dies?|gets killed|is actually|turns out to be|was the killer|was the villain)\s+(?:in|during|at|before)\s+(?:this|the)\s+(?:movie|film|show|series|episode)\b/i,
  /\b(?:he|she|they|it|rengoku|zenitsu|tanjiro|naruto|goku|madara|luffy|spiderman|batman|wonder woman|iron man|the villain|the killer|the hero|the main character|the protagonist|the character)\s+(?:dies?|gets killed|is actually|turns out to be|was the killer|was the villain)\b/i,
  /\b(?:the villain|the killer|the hero|the main character|the mc|the protagonist|the character)\s+(?:was|is)\b/i,
  /\breveal(?:s|ed)?\s+(?:that|who)\b/i,
  /\b(?:killer|villain|traitor|murderer)\s+(?:is|was)\b/i,
  /\b(?:dies?|gets killed|turns out to be|was the killer|was the villain|is actually)\b/i,
  /\b(?:rengoku|zenitsu|tanjiro|naruto|goku|madara|luffy|spiderman|batman|wonder woman|iron man)\s+(?:dies?|gets killed)\b/i,
];

const isSpoilerReview = (text) => {
  if (typeof text !== "string") return false;

  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalized) return false;

  return spoilerPatterns.some((pattern) => pattern.test(normalized));
};

module.exports = { isSpoilerReview };
