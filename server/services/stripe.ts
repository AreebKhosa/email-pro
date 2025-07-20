import Stripe from 'stripe';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const planPrices = {
  starter: 'price_1234567890', // Replace with actual Stripe price IDs
  pro: 'price_1234567891',
  premium: 'price_1234567892',
};

export async function createStripeCheckout(
  email: string,
  plan: string,
  userId: string
): Promise<string> {
  try {
    const priceId = planPrices[plan as keyof typeof planPrices];
    if (!priceId) {
      throw new Error('Invalid plan selected');
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
