---
name: postgresql-design
description: Use when designing PostgreSQL tables, database relationships, Laravel migrations, indexes, and transaction-safe order processing.
---

# PostgreSQL Database Design

Follow this process:

1. Review system requirements.
2. Identify entities and relationships.
3. Design normalized tables.
4. Define primary keys.
5. Define foreign keys.
6. Define unique constraints.
7. Define appropriate indexes.
8. Use appropriate PostgreSQL data types.
9. Use numeric or decimal for monetary values.
10. Ensure stock cannot become negative.
11. Preserve historical order prices.
12. Review transaction requirements.

Use Laravel migrations for schema changes.

Never:

- Drop existing data without approval.
- Store monetary values as floating point.
- Allow orphaned order records.
- Allow invalid product quantities.

Verify migrations and database relationships.
