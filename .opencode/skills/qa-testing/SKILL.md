---
name: qa-testing
description: Use when testing ordering system functionality, API endpoints, authentication, checkout, security, and integration.
---

# Ordering System QA

Testing workflow:

1. Review the requirements.
2. Inspect the implemented features.
3. Identify positive test scenarios.
4. Identify negative test scenarios.
5. Execute backend tests.
6. Execute frontend tests.
7. Verify API integration.
8. Verify authorization.
9. Verify checkout and inventory.
10. Document failures.

Important scenarios:

- Invalid credentials.
- Missing required fields.
- Invalid product quantities.
- Insufficient stock.
- Unauthorized order access.
- Failed checkout.
- Successful checkout.
- Invalid status transitions.

Do not report a test as passed unless it was executed.

Provide a QA report with:

- Test case.
- Expected result.
- Actual result.
- Status.
- Bug details.
