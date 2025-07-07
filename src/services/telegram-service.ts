import { format } from 'date-fns';

const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
const CHAT_IDS = ['6468973567', '1908056692'];

// Basic HTML formatting is supported by Telegram's `parse_mode: 'HTML'`
// https://core.telegram.org/bots/api#html-style
function escapeHtml(text: string | undefined | null): string {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export async function sendTelegramNotification(message: string): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn('Telegram bot token (NEXT_PUBLIC_TELEGRAM_BOT_TOKEN) is not configured in .env.local. Skipping notification.');
    return;
  }

  const sendPromises = CHAT_IDS.map(chatId => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    });

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
    })
    .then(async (response) => {
        if (!response.ok) {
            const err = await response.json();
            console.error(`Failed to send Telegram message to ${chatId}:`, err.description || JSON.stringify(err));
        }
    })
    .catch(error => {
      console.error(`Error sending Telegram notification to ${chatId}:`, error);
    });
  });

  // Fire-and-forget; don't block the UI
  Promise.all(sendPromises);
}

// Formatters for different notification types

export function formatNewCustomerMessage(customer: any): string {
    return `✨ <b>New Customer Added</b> ✨

<b>Name:</b> ${escapeHtml(customer.fullName)}
<b>Phone:</b> ${escapeHtml(customer.phone)}
<b>Email:</b> ${escapeHtml(customer.email) || 'N/A'}
<b>Address:</b> ${escapeHtml(customer.address)}
<b>Preferences:</b> ${escapeHtml(customer.preferences) || 'N/A'}
<b>Action By:</b> ${escapeHtml(customer.createdBy) || 'N/A'}`;
}

export function formatUpdatedCustomerMessage(customer: any): string {
    return `✏️ <b>Customer Details Updated</b> ✏️

<b>Name:</b> ${escapeHtml(customer.fullName)}
<b>Phone:</b> ${escapeHtml(customer.phone)}
<b>Email:</b> ${escapeHtml(customer.email) || 'N/A'}
<b>Address:</b> ${escapeHtml(customer.address)}
<b>Preferences:</b> ${escapeHtml(customer.preferences) || 'N/A'}
<b>Action By:</b> ${escapeHtml(customer.updatedBy) || 'N/A'}`;
}

export function formatNewOrderMessage(order: any, customerName: string): string {
    return `🎉 <b>New Order Added</b> 🎉

<b>Order ID:</b> ${escapeHtml(order.orderId)}
<b>Customer:</b> ${escapeHtml(customerName)}
<b>Delivery Date:</b> ${format(new Date(order.deliveryDate), 'PP')}
<b>Total Value:</b> LKR ${order.totalValue.toFixed(2)}
<b>Status:</b> ${escapeHtml(order.status)}

<b>Products:</b>
${escapeHtml(order.products)}

<b>Instructions:</b>
${escapeHtml(order.specialInstructions) || 'N/A'}

<b>Action By:</b> ${escapeHtml(order.createdBy) || 'N/A'}`;
}

export function formatUpdatedOrderMessage(order: any, customerName: string): string {
     return `✏️ <b>Order Updated</b> ✏️

<b>Order ID:</b> ${escapeHtml(order.orderId)}
<b>Customer:</b> ${escapeHtml(customerName)}
<b>Delivery Date:</b> ${format(new Date(order.deliveryDate), 'PP')}
<b>Total Value:</b> LKR ${order.totalValue.toFixed(2)}
<b>Status:</b> ${escapeHtml(order.status)}

<b>Products:</b>
${escapeHtml(order.products)}

<b>Instructions:</b>
${escapeHtml(order.specialInstructions) || 'N/A'}

<b>Action By:</b> ${escapeHtml(order.updatedBy) || 'N/A'}`;
}
