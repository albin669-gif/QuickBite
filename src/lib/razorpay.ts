import crypto from 'crypto';
import Razorpay from 'razorpay';

// Razorpay credentials
const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder123';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret_456';

let razorpayInstance: Razorpay | null = null;

export function getWebhookSecret(): string | null {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: RAZORPAY_WEBHOOK_SECRET is missing in production environment.');
      return null;
    }
    // In local development/testing, check for DEV_RAZORPAY_WEBHOOK_SECRET
    return process.env.DEV_RAZORPAY_WEBHOOK_SECRET || null;
  }
  return secret;
}

export function validateRazorpayConfig(): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.includes('placeholder')) {
    missing.push('NEXT_PUBLIC_RAZORPAY_KEY_ID');
  }
  if (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET.includes('placeholder')) {
    missing.push('RAZORPAY_KEY_SECRET');
  }
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    missing.push('RAZORPAY_WEBHOOK_SECRET');
  }
  return {
    isValid: missing.length === 0,
    missing,
  };
}

export function getRazorpayClient(): Razorpay {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

/**
 * Verify Razorpay Checkout payment signature securely using timing-safe comparison.
 * Signature is computed as: HMAC-SHA256(order_id + "|" + razorpay_payment_id, secret)
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  try {
    const { orderId, paymentId, signature } = params;
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (error) {
    console.error('Error verifying Razorpay payment signature:', error);
    return false;
  }
}

/**
 * Verify Razorpay Webhook signature using HMAC-SHA256 over the raw JSON payload.
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string;
  customSecret?: string;
}): boolean {
  try {
    const { rawBody, signature, customSecret } = params;
    const secretToUse = customSecret || getWebhookSecret();

    if (!rawBody || !signature || !secretToUse) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secretToUse)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (error) {
    console.error('Error verifying Razorpay webhook signature:', error);
    return false;
  }
}
