export const formatBriefField = (field: any): string => {
  if (!field) return '';
  let text = '';
  if (typeof field === 'string') {
    text = field;
  } else if (typeof field === 'object') {
    if (Array.isArray(field)) {
      text = field.join(', ');
    } else {
      text = field.action ?? field.summary ?? field.explanation ?? field.message ?? JSON.stringify(field);
    }
  } else {
    text = String(field);
  }
  return text
    .replace(/3060/g, "30–60")
    .replace(/30\s*60/g, "30–60")
    .replace(/imminent gridlock/gi, "critical congestion risk")
    .replace(/This congestion delays is primarily driven by active triggers:\s*/gi, "This congestion pressure is primarily driven by ")
    .replace(/This critical congestion risk is primarily driven by active triggers:\s*/gi, "This congestion pressure is primarily driven by ")
    .replace(/This imminent gridlock is primarily driven by active triggers:\s*/gi, "This congestion pressure is primarily driven by ")
    .replace(/\*\*/g, '')
    .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2600-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '')
    .trim();
};

export const getDefaultMitigationKey = (actionText: string): string => {
  const text = (actionText || '').toLowerCase();
  if (
    text.includes('route advisory') ||
    text.includes('divert') ||
    text.includes('diversion') ||
    text.includes('route advisory to business bay') ||
    text.includes('route advisory to al maktoum')
  ) {
    return 'route-advisory';
  }
  if (
    text.includes('signal split') ||
    text.includes('signal timing') ||
    text.includes('junction split') ||
    text.includes('junction timing')
  ) {
    return 'signal-timing';
  }
  if (text.includes('metro') || text.includes('public transport') || text.includes('transit')) {
    return 'metro-riders';
  }
  if (text.includes('toll') || text.includes('salik') || text.includes('pricing')) {
    return 'salik-shift';
  }
  return 'monitor';
};
