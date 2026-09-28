export function applyWorkshopFavorites(assets, favoriteIds = []) {
  const favorites = favoriteIds instanceof Set ? favoriteIds : new Set(favoriteIds || []);
  return (assets || []).map((asset) => ({ ...asset, favorite: favorites.has(asset.assetId) || asset.favorite === true }));
}

export function updateWorkshopFavoriteState(assets, assetId, favorite) {
  return (assets || []).map((asset) => asset.assetId === assetId ? { ...asset, favorite: favorite === true } : asset);
}
