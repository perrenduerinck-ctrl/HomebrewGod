export const TOKEN_VISIBILITY_SHARED = "shared";
export const TOKEN_VISIBILITY_DM = "dm";

export function normalizeTokenVisibility(value) {
  return String(value || "").trim().toLowerCase() === TOKEN_VISIBILITY_DM
    ? TOKEN_VISIBILITY_DM
    : TOKEN_VISIBILITY_SHARED;
}

export function tokenCollectionForVisibility(value) {
  return normalizeTokenVisibility(value) === TOKEN_VISIBILITY_DM
    ? "dmTokens"
    : "tokens";
}

export function tokenCollectionForRecord(token = {}) {
  return tokenCollectionForVisibility(token.visibility);
}

export function tokenIsDmOnly(token = {}) {
  return normalizeTokenVisibility(token.visibility) === TOKEN_VISIBILITY_DM;
}

export function normalizeTokenPrivacy(token = {}, sourceCollection = "tokens") {
  const visibility = sourceCollection === "dmTokens"
    ? TOKEN_VISIBILITY_DM
    : normalizeTokenVisibility(token.visibility);
  return {
    ...token,
    visibility
  };
}
