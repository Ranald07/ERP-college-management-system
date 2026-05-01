export const fmt2 = (n) => parseFloat(n || 0).toFixed(2);

export const trendLabel = (trend) => ({
  Improving: "Improving ↑",
  Stable:    "Stable →",
  Declining: "Declining ↓",
  "No data": "No Data",
}[trend] || "No Data");

export const trendClass = (trend) => ({
  Improving: "trend--up",
  Stable:    "trend--neutral",
  Declining: "trend--down",
  "No data": "trend--none",
}[trend] || "trend--none");
