/**
 * PlanGuard
 * Enforces plan-based limitations and business rules.
 */
export class PlanGuard {
  /**
   * Checks if the user is on a free plan and applies logic.
   */
  isFreePlan(user: any): boolean {
    return user?.plan === 'free';
  }

  /**
   * Determines if a batch fetch is allowed.
   */
  canBatchFetch(user: any, questionCount: number): boolean {
    if (this.isFreePlan(user)) return questionCount <= 5;
    return true;
  }
}
