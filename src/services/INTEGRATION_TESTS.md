# Integration Tests Guide

This directory contains integration tests that verify the system's interaction with external services.

## Test Files

### 1. RateService.integration.test.ts
Tests the integration with ExchangeRate-API:
- Successful rate fetching from real API
- Invalid API key handling
- Invalid currency code handling
- Network timeout scenarios
- Non-existent endpoint handling
- API response parsing

### 2. NotificationService.integration.test.ts
Tests the integration with Resend email service:
- Successful email sending via Resend API
- Cooldown period enforcement
- Invalid API key handling
- Different notification conditions
- Email content generation

### 3. EndToEnd.integration.test.ts
Tests the complete monitoring flow:
- Full flow: fetch rate → check threshold → send notification
- Rate within thresholds (no notification)
- Rate exceeding upper threshold
- Rate falling below lower threshold
- API timeout handling in complete flow
- Invalid API response handling
- Email sending failure handling
- Transient failure recovery

## Running Integration Tests

### Prerequisites

1. **ExchangeRate-API Key**: Sign up at https://www.exchangerate-api.com/ to get a free API key
2. **Resend API Key**: Sign up at https://resend.com/ to get an API key

### Setup

1. Copy the test environment file:
   ```bash
   cp .env.test .env.test.local
   ```

2. Edit `.env.test.local` and add your test API keys:
   ```bash
   EXCHANGE_API_KEY=your_actual_test_key
   RESEND_API_KEY=re_your_actual_test_key
   FROM_EMAIL=your_verified_sender@yourdomain.com
   TO_EMAIL=your_test_recipient@example.com
   ```

3. Load the test environment:
   ```bash
   export $(cat .env.test.local | xargs)
   ```

### Run Tests

Run all integration tests:
```bash
npm run test:integration
```

Run only unit tests (skip integration):
```bash
npm run test:unit
```

Run all tests:
```bash
npm test
```

Run specific integration test file:
```bash
npx jest src/services/RateService.integration.test.ts
```

## Test Behavior

### Without API Keys
If API keys are not configured, the tests will:
- Skip tests that require real API calls
- Log a message indicating the test was skipped
- Still run tests that verify error handling

### With API Keys
With valid API keys configured, the tests will:
- Make real API calls to ExchangeRate-API
- Send real emails via Resend (to your test email)
- Verify the complete end-to-end flow
- Test error scenarios with invalid credentials

## Important Notes

### Rate Limits
- ExchangeRate-API free tier: 1,500 requests/month
- Be mindful of rate limits when running integration tests frequently

### Email Sending
- Integration tests will send real emails to the configured TO_EMAIL
- Use a test email address to avoid spam
- Some tests with retry logic are skipped by default (they take 5+ minutes)
- To run skipped tests: `jest --testNamePattern="slow test"`

### Test Isolation
- Integration tests run sequentially (`--runInBand`) to avoid conflicts
- Each test uses fresh service instances
- Notification cache is reset between tests

### Timeouts
- API tests: 15-30 seconds
- Email tests: 30-60 seconds
- End-to-end tests: 45 seconds
- Retry tests: up to 400 seconds (includes 5-minute retry delay)

## Troubleshooting

### Tests are skipped
- Verify API keys are set in environment variables
- Check that keys are not the placeholder values

### API timeout errors
- Check your internet connection
- Verify the API endpoint is accessible
- ExchangeRate-API may be experiencing issues

### Email sending fails
- Verify your Resend API key is valid
- Check that FROM_EMAIL is verified in your Resend account
- Ensure TO_EMAIL is a valid email address

### Tests take too long
- Some tests include retry logic (5-minute delays)
- Use `--testNamePattern` to run specific tests
- Consider running unit tests separately for faster feedback

## CI/CD Integration

For CI/CD pipelines, you can:

1. Skip integration tests by default:
   ```bash
   npm run test:unit
   ```

2. Run integration tests only when API keys are available:
   ```bash
   if [ -n "$EXCHANGE_API_KEY" ]; then
     npm run test:integration
   fi
   ```

3. Use separate test environments for different stages:
   - Development: Skip integration tests
   - Staging: Run with test API keys
   - Production: Run full test suite before deployment
