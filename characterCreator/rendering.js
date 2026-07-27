export function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

export function renderTextList(
  values,
  fallback = "None"
) {
  const entries =
    (Array.isArray(values)
      ? values
      : []
    ).map((value) => {
      return String(
        value == null
          ? ""
          : value
      ).trim();
    }).filter(Boolean);

  return entries.length
    ? entries.map(escapeHtml)
        .join(", ")
    : escapeHtml(fallback);
}

