import { db } from './db/store';
import { CartItem, Promotion } from '../types/erp';

export class PromotionService {
  /**
   * Evaluates active promotions against current cart line items and basket total
   */
  public static evaluateCart(items: CartItem[]): {
    evaluatedItems: CartItem[];
    billDiscountTotal: number;
    appliedPromotions: string[];
  } {
    const today = new Date().toISOString().split('T')[0];
    const activePromos = db.collection('promotions').find(
      (p: Promotion) => p.isActive && p.startDate <= today && p.endDate >= today
    ).sort((a: Promotion, b: Promotion) => a.priority - b.priority);

    const appliedPromotions: string[] = [];

    // Clone items
    const evaluatedItems: CartItem[] = items.map(item => ({
      ...item,
      discountAmount: 0,
      discountReason: undefined
    }));

    // 1. Item Level Promotions (BOGO, Product Specific)
    for (const promo of activePromos) {
      if (promo.targetType === 'SPECIFIC_PRODUCT' && promo.targetId) {
        const line = evaluatedItems.find(it => it.productId === promo.targetId);
        if (line) {
          if (promo.type === 'BUY_X_GET_Y' && promo.buyQuantity && promo.getQuantity) {
            const bundleSize = promo.buyQuantity + promo.getQuantity;
            if (line.quantity >= bundleSize) {
              const freeItemsCount = Math.floor(line.quantity / bundleSize) * promo.getQuantity;
              const discount = Number((freeItemsCount * line.unitPrice).toFixed(2));
              line.discountAmount += discount;
              line.discountReason = promo.name;
              appliedPromotions.push(promo.name);
            }
          } else if (promo.type === 'PERCENTAGE_DISCOUNT') {
            const discount = Number(((line.unitPrice * line.quantity) * (promo.discountValue / 100)).toFixed(2));
            line.discountAmount += discount;
            line.discountReason = promo.name;
            appliedPromotions.push(promo.name);
          }
        }
      }
    }

    // Recompute line net totals
    evaluatedItems.forEach(item => {
      const gross = item.unitPrice * item.quantity;
      const afterDiscount = Math.max(0, gross - item.discountAmount);
      item.taxAmount = Number((afterDiscount * item.taxRate).toFixed(2));
      item.netTotal = Number((afterDiscount + item.taxAmount).toFixed(2));
    });

    // 2. Bill Level Basket Promotions (e.g. 5% off over 5,000)
    let billDiscountTotal = 0;
    const currentSubtotal = evaluatedItems.reduce((acc, it) => acc + (it.unitPrice * it.quantity - it.discountAmount), 0);

    for (const promo of activePromos) {
      if (promo.targetType === 'MIN_BASKET_TOTAL' && promo.minBasketValue) {
        if (currentSubtotal >= promo.minBasketValue) {
          if (promo.type === 'PERCENTAGE_DISCOUNT') {
            const disc = Number((currentSubtotal * (promo.discountValue / 100)).toFixed(2));
            billDiscountTotal += disc;
            appliedPromotions.push(`${promo.name} (-${disc.toFixed(2)})`);
          } else if (promo.type === 'FIXED_AMOUNT') {
            billDiscountTotal += promo.discountValue;
            appliedPromotions.push(`${promo.name} (-${promo.discountValue.toFixed(2)})`);
          }
        }
      }
    }

    return {
      evaluatedItems,
      billDiscountTotal,
      appliedPromotions
    };
  }
}
