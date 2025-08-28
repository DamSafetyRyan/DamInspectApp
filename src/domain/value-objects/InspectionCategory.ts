/**
 * InspectionCategory Value Object
 * Represents an inspection category with dam type and category name
 */

import { DamType } from './DamEnums';

export class InspectionCategory {
  constructor(
    public readonly damType: DamType,
    public readonly categoryName: string
  ) {
    this.validateCategory();
  }

  /**
   * Validate inspection category
   */
  private validateCategory(): void {
    if (!this.categoryName || this.categoryName.trim().length === 0) {
      throw new Error('Category name is required');
    }

    // Validate that category is appropriate for dam type
    const validCategories = this.getValidCategoriesForDamType(this.damType);
    if (!validCategories.includes(this.categoryName)) {
      throw new Error(`Invalid category '${this.categoryName}' for dam type '${this.damType}'`);
    }
  }

  /**
   * Get valid categories for a dam type
   */
  private getValidCategoriesForDamType(damType: DamType): string[] {
    const commonCategories = [
      'Instrumentation and Monitoring',
      'Miscellaneous',
      'Environmental'
    ];

    switch (damType) {
      case DamType.CONCRETE:
        return [
          'Structural Integrity',
          'Vegetation and Surface Conditions',
          'Seepage and Drainage',
          'Spillways, Outlets, and Appurtenant Structures',
          ...commonCategories
        ];
      
      case DamType.EARTHEN:
        return [
          'Embankment Integrity',
          'Seepage and Drainage',
          'Vegetation and Surface Conditions',
          'Spillways, Outlets, and Appurtenant Structures',
          ...commonCategories
        ];
      
      default:
        return [
          'Structural Integrity',
          'Embankment Integrity',
          'Seepage and Drainage',
          'Vegetation and Surface Conditions',
          'Spillways, Outlets, and Appurtenant Structures',
          ...commonCategories
        ];
    }
  }

  /**
   * Get all valid categories for a dam type (static method)
   */
  static getValidCategoriesForDamType(damType: DamType): string[] {
    const temp = new InspectionCategory(damType, 'temp');
    return temp.getValidCategoriesForDamType(damType);
  }

  /**
   * Create inspection category from strings
   */
  static create(damTypeString: string, categoryName: string): InspectionCategory {
    let damType: DamType;
    
    switch (damTypeString.toLowerCase()) {
      case 'concrete':
        damType = DamType.CONCRETE;
        break;
      case 'earthen':
        damType = DamType.EARTHEN;
        break;
      case 'rockfill':
        damType = DamType.ROCKFILL;
        break;
      case 'masonry':
        damType = DamType.MASONRY;
        break;
      case 'composite':
        damType = DamType.COMPOSITE;
        break;
      default:
        damType = DamType.OTHER;
        break;
    }

    return new InspectionCategory(damType, categoryName);
  }

  /**
   * Check equality with another InspectionCategory
   */
  equals(other: InspectionCategory): boolean {
    return this.damType === other.damType && this.categoryName === other.categoryName;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `${this.damType} - ${this.categoryName}`;
  }

  /**
   * Convert to plain object for serialization
   */
  toPlainObject() {
    return {
      damType: this.damType,
      categoryName: this.categoryName,
    };
  }

  /**
   * Create from plain object
   */
  static fromPlainObject(obj: { damType: DamType; categoryName: string }): InspectionCategory {
    return new InspectionCategory(obj.damType, obj.categoryName);
  }
}