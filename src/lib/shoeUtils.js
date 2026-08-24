const getShoeRecencyKey = (shoe = {}) => (
  shoe.last_used_date
  || shoe.updated_at
  || shoe.created_at
  || ''
);

export function sortShoesByRecent(shoes = []) {
  return [...shoes].sort((a, b) => {
    const aUsed = a.last_used_date || '';
    const bUsed = b.last_used_date || '';

    if (aUsed !== bUsed) {
      if (!aUsed) return 1;
      if (!bUsed) return -1;
      return bUsed.localeCompare(aUsed);
    }

    const aRecency = getShoeRecencyKey(a);
    const bRecency = getShoeRecencyKey(b);
    if (aRecency !== bRecency) {
      return String(bRecency).localeCompare(String(aRecency));
    }

    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}
