# Formal Query Grammar

Example query:

GET /appointments?
where=(doctor.department.name='radiology' AND status='scheduled')
OR (patient.country='USA')
&sort=-date,doctor.name
&limit=20

## Grammar Specification

expression ::= term (OR term)*

term ::= factor (AND factor)*

factor ::= condition | "(" expression ")"

condition ::= field operator value

field ::= identifier ("." identifier)*

operator ::=
= | != | > | >= | < | <= | IN | LIKE | ILIKE

value ::= string | number | list

list ::= "(" value ("," value)* ")"