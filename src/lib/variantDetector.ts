import type { CostRule } from './supabase';

/**
 * Detects the product variant from a combination of fields.
 * Priority: explicit variation field → SKU → product title → default "30ml".
 *
 * The detection looks for volume patterns like "15ml", "30 ml", "60ML", "30 mL"
 * anywhere in the text. If no volume is found, it falls back to the default
 * variant (30ml) so the user never gets an empty cost.
 */
export function detectVariant(
  variation: string,
  sku: string,
  productName: string,
): string {
  const searchOrder = [variation, sku, productName].filter(Boolean);
  const combined = searchOrder.join(' ').toLowerCase().replace(/\s+/g, ' ').trim();

  // Match patterns like "15ml", "15 ml", "15m l", "60ml"
  const match = combined.match(/(\d{2,3})\s*ml\b/);
  if (match) {
    return `${match[1]}ml`;
  }

  // Default fallback
  return '30ml';
}

/**
 * Matches a detected variant to a cost rule and returns the unit cost.
 * Returns 0 if no matching rule is found.
 */
export function getUnitCost(detectedVariant: string, costRules: CostRule[]): number {
  const normalized = detectedVariant.toLowerCase().replace(/\s+/g, '');
  const rule = costRules.find(
    (r) => r.variant_label.toLowerCase().replace(/\s+/g, '') === normalized,
  );
  return rule ? Number(rule.cost) : 0;
}
