import { ASTNode, ASTNodeType, ConditionNode, AggregateConditionNode } from '../types/ast.types';
import { JoinPlanner } from './joinPlanner';

export interface ResolvedCondition {
  alias: string;
  column: string;
}

export interface FilterPlan {
  resolvedConditions: Map<ConditionNode | AggregateConditionNode, ResolvedCondition>;
}

/**
 * Walks the AST, registers required joins via JoinPlanner, and
 * resolves each leaf condition to its { alias, column } pair.
 */
export class FilterPlanner {
  private resolvedConditions = new Map<ConditionNode | AggregateConditionNode, ResolvedCondition>();

  constructor(private readonly joinPlanner: JoinPlanner) {}

  plan(node: ASTNode | null): FilterPlan {
    this.resolvedConditions = new Map();
    if (node) {
      this.walkNode(node);
    }
    return { resolvedConditions: new Map(this.resolvedConditions) };
  }

  private walkNode(node: ASTNode): void {
    if (node.type === ASTNodeType.AND || node.type === ASTNodeType.OR) {
      for (const child of node.children) {
        this.walkNode(child);
      }
      return;
    }

    // CONDITION or AGGREGATE — resolve via JoinPlanner
    if (node.type === ASTNodeType.CONDITION || node.type === ASTNodeType.AGGREGATE) {
      const resolved = this.joinPlanner.registerPath(node.field);
      this.resolvedConditions.set(node, resolved);
    }
  }
}
