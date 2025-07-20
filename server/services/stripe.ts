import Stripe from 'stripe';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

async function getPlanPrices() {
  try {
    // Try to get prices from admin config first
    const starterPrice = await storage.getConfig('stripe_starter_price_id');
    const proPrice = await storage.getConfig('stripe_pro_price_id');
    const premiumPrice = await storage.getConfig('stripe_premium_price_id');
    
    return {
      starter: typeof starterPrice === 'string' ? starterPrice : starterPrice?.configValue || null,
      pro: typeof proPrice === 'string' ? proPrice : proPrice?.configValue || null,
      premium: typeof premiumPrice === 'string' ? premiumPrice : premiumPrice?.configValue || null,
    };
  } catch (error) {
    console.log('Stripe price IDs not configured in admin panel');
    return {
      starter: null,
      pro: null,
      premium: null,
    };
  }
}

export async function createStripeCheckout(
  email: string,
  plan: string,
  userId: string
): Promise<string> {
  try {
    // Check if Stripe is properly configured
    const stripeSecretKey = await storage.getConfig('stripe_secret_key');
    if (!stripeSecretKey || (typeof stripeSecretKey === 'object' && !stripeSecretKey.configValue)) {
      throw new Error('Stripe Secret Key not configured. Please add it in the admin panel under Stripe settings.');
    }

    const planPrices = await getPlanPrices();
    const priceId = planPrices[plan as keyof typeof planPrices];
    if (!priceId) {
      throw new Error(`Stripe Price ID for ${plan} plan not configured. Please add it in the admin panel under Stripe → Subscription Price IDs.`);
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NODE_ENV === 'production' ? 'https://' : 'http://'}${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/dashboard?upgrade=success`,
      cancel_url: `${process.env.NODE_ENV === 'production' ? 'https://' : 'http://'}${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/upgrade?canceled=true`,
      metadata: {
        userId,
        plan,
      },
    });

    return session.url || '';
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
}

export async function handleStripeWebhook(req: any, res: any): Promise<void> {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Missing Stripe webhook secret');
    return res.status(400).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, plan } = session.metadata || {};
        
        if (userId && plan) {
          await storage.updateUserPlan(userId, plan);
          
          if (session.customer) {
            await storage.updateUserStripeInfo(
              userId,
              session.customer as string,
              session.subscription as string
            );
          }
        }
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find user by Stripe customer ID
        // Note: In a real implementation, you'd need a way to look up users by Stripe customer ID
        // For now, we'll skip this as it requires additional database queries
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
