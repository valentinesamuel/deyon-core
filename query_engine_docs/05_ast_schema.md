# AST Schema

Example query:

(a=1 AND b=2) OR (c=3 AND d=4)

AST Representation:

{
  "type": "OR",
  "children": [
    {
      "type": "AND",
      "children": [
        {"field": "a", "op": "eq", "value": 1},
        {"field": "b", "op": "eq", "value": 2}
      ]
    },
    {
      "type": "AND",
      "children": [
        {"field": "c", "op": "eq", "value": 3},
        {"field": "d", "op": "eq", "value": 4}
      ]
    }
  ]
}

Node Types:
- LogicalNode
- ConditionNode
- AggregateNode