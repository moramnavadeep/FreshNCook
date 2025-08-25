'use server';
/**
 * @fileOverview A flow to send SMS alerts for ingredients that are about to expire.
 *
 * - sendExpirationAlerts - A function that checks ingredients and sends an SMS alert.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendSms } from '@/services/sms';
import { isBefore, addDays, format } from 'date-fns';

const SendExpirationAlertsInputSchema = z.object({
  ingredients: z.array(z.object({
    name: z.string(),
    expirationDate: z.string().optional(),
  })),
  phoneNumber: z.string().describe("The user's phone number to send the alert to."),
});
type SendExpirationAlertsInput = z.infer<typeof SendExpirationAlertsInputSchema>;

export async function sendExpirationAlerts(input: SendExpirationAlertsInput): Promise<{ message: string }> {
  return sendExpirationAlertsFlow(input);
}

const sendExpirationAlertsFlow = ai.defineFlow(
  {
    name: 'sendExpirationAlertsFlow',
    inputSchema: SendExpirationAlertsInputSchema,
    outputSchema: z.object({ message: z.string() }),
  },
  async ({ ingredients, phoneNumber }) => {
    const today = new Date();
    const threeDaysFromNow = addDays(today, 3);

    const expiringSoon = ingredients.filter(ingredient => {
      if (!ingredient.expirationDate) return false;
      try {
        const expiration = new Date(ingredient.expirationDate);
        // Check if expiration is in the past or within the next 3 days
        return isBefore(expiration, threeDaysFromNow);
      } catch (e) {
        return false;
      }
    });

    if (expiringSoon.length === 0) {
      return { message: "No ingredients are expiring soon. No alert sent." };
    }

    const expiringItemsText = expiringSoon
      .map(i => `${i.name} (expiring on ${format(new Date(i.expirationDate!), 'MMM dd')})`)
      .join(', ');

    const messageBody = `Heads up from FreshNCook! These ingredients are expiring soon: ${expiringItemsText}. Time to cook them up!`;

    try {
      await sendSms(phoneNumber, messageBody);
      return { message: `Alert sent successfully to ${phoneNumber}!` };
    } catch (error: any) {
      console.error("Failed to send SMS:", error);
      throw new Error(`Failed to send expiration alert. Please check your Twilio configuration. Error: ${error.message}`);
    }
  }
);
