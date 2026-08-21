import { prisma } from './db';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

export async function sendWhatsAppMessage(to: string, text: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.log(`[WhatsApp Mock Output to ${to}]: ${text}`);
    return { success: true, mock: true };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });
    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    console.error('WhatsApp API Error:', err);
    return { success: false, error: err.message };
  }
}

export async function sendWhatsAppQuickButtons(to: string, text: string, buttons: { id: string; title: string }[]) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.log(`[WhatsApp Quick Buttons to ${to}]: ${text} -> [${buttons.map(b => b.title).join(', ')}]`);
    return { success: true, mock: true };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text },
          action: {
            buttons: buttons.map(b => ({
              type: 'reply',
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      }),
    });
    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    console.error('WhatsApp Quick Buttons Error:', err);
    return { success: false, error: err.message };
  }
}

export async function handleIncomingWhatsAppMessage(from: string, messageText: string) {
  const text = messageText.trim();

  let session = await prisma.whatsAppSession.findUnique({ where: { phone: from } });
  if (!session) {
    session = await prisma.whatsAppSession.create({
      data: { phone: from, step: 'IDLE' },
    });
  }

  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { phone: { contains: from } },
        { whatsappNumber: { contains: from } },
        { otherMobile: { contains: from } },
      ],
    },
  });

  if (!customer) {
    await sendWhatsAppMessage(
      from,
      `Namaste! AAPKA MOBILE NUMBER REGISTERED NAHI HAI.\n\nKripya hamari Cylinder Agency se contact karein apna B2B account activate karne ke liye.`
    );
    return;
  }

  if (text.toLowerCase() === 'hi' || text.toLowerCase() === 'order' || session.step === 'IDLE') {
    await prisma.whatsAppSession.update({
      where: { phone: from },
      data: { step: 'SELECT_PRODUCT', customerId: customer.id },
    });

    await sendWhatsAppQuickButtons(
      from,
      `Namaste ${customer.name}! Aapko kaun sa cylinder order karna hai?\n\n1. 19 KG Commercial LPG\n2. 47.5 KG Industrial LPG`,
      [
        { id: 'PROD_19KG', title: '19 KG Commercial' },
        { id: 'PROD_47KG', title: '47.5 KG Industrial' },
      ]
    );
    return;
  }

  if (session.step === 'SELECT_PRODUCT') {
    let productName = '19 KG Commercial LPG Cylinder';
    let productId = 'prod_19kg';
    let unitPrice = 1850;

    if (text.includes('47.5') || text.includes('47') || text === 'PROD_47KG') {
      productName = '47.5 KG Industrial LPG Cylinder';
      productId = 'prod_47kg';
      unitPrice = 4500;
    }

    await prisma.whatsAppSession.update({
      where: { phone: from },
      data: {
        step: 'ENTER_QTY',
        draftOrder: { productId, productName, unitPrice },
      },
    });

    await sendWhatsAppMessage(
      from,
      `Selected: ${productName}\nPrice: ₹${unitPrice}/pc\n\nKripya jitne cylinder chahiye unki numeric Quantity type karein (e.g. 5 ya 10):`
    );
    return;
  }

  if (session.step === 'ENTER_QTY') {
    const qty = parseInt(text, 10);
    if (isNaN(qty) || qty <= 0) {
      await sendWhatsAppMessage(from, 'Kripya valid numeric quantity type karein (e.g. 5, 10, 20):');
      return;
    }

    const draft = (session.draftOrder as any) || {};
    draft.orderedQty = qty;

    await prisma.whatsAppSession.update({
      where: { phone: from },
      data: {
        step: 'CONFIRM',
        draftOrder: draft,
      },
    });

    const totalAmount = qty * (draft.unitPrice || 1850);
    await sendWhatsAppQuickButtons(
      from,
      `📦 ORDER SUMMARY:\n\nCustomer: ${customer.name}\nItem: ${draft.productName}\nQty: ${qty} Pcs\nTotal Estimated: ₹${totalAmount}\n\nKya aap is order ko confirm karna chahte hain?`,
      [
        { id: 'CONFIRM_YES', title: 'CONFIRM ORDER ✅' },
        { id: 'CONFIRM_NO', title: 'CANCEL ❌' },
      ]
    );
    return;
  }

  if (session.step === 'CONFIRM') {
    if (text.includes('YES') || text.includes('CONFIRM') || text === 'CONFIRM_YES') {
      const draft = (session.draftOrder as any) || {};
      const orderCount = await prisma.cylinderOrder.count();
      const orderNumber = `CYL-ORD-${String(orderCount + 1).padStart(5, '0')}`;

      const newOrder = await prisma.cylinderOrder.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          whatsappNumber: from,
          source: 'WHATSAPP',
          status: 'PENDING_APPROVAL',
          requestedDeliveryDate: new Date().toISOString().split('T')[0],
          deliveryAddress: customer.address,
          area: customer.area || '',
          route: customer.route || '',
          assignedDeliveryBoyId: customer.defaultDeliveryBoyId || null,
          items: {
            create: [
              {
                productId: draft.productId || 'prod_19kg',
                productName: draft.productName || '19 KG Commercial LPG Cylinder',
                orderedQty: draft.orderedQty || 5,
                unitPrice: draft.unitPrice || 1850,
                totalAmount: (draft.orderedQty || 5) * (draft.unitPrice || 1850),
              },
            ],
          },
        },
      });

      await prisma.approvalQueueItem.create({
        data: {
          requestType: 'ORDER_APPROVAL',
          referenceId: newOrder.id,
          requestedBy: `WhatsApp (${customer.name})`,
          assignedTo: 'MANAGER',
          payload: newOrder,
          notes: `WhatsApp Order ${orderNumber} received for ${draft.orderedQty} Pcs`,
        },
      });

      await prisma.whatsAppSession.update({
        where: { phone: from },
        data: { step: 'IDLE', draftOrder: {} },
      });

      await sendWhatsAppMessage(
        from,
        `✅ SHUKRIYA! AAPKA ORDER SUCCESSFUL PLACE HO GAYA HAI!\n\nOrder #: ${orderNumber}\nItem: ${draft.productName} (${draft.orderedQty} Pcs)\nStatus: Pending Manager Approval\n\nDelivery Partner jald hi dispatch hoga. Aapka Cylinder Agency Dashboard se update bhej diya jayega.`
      );
      return;
    } else {
      await prisma.whatsAppSession.update({
        where: { phone: from },
        data: { step: 'IDLE', draftOrder: {} },
      });
      await sendWhatsAppMessage(from, 'Order Cancel kar diya gaya hai. Jab bhi zaroorat ho, "Hi" bhej kar naya order de sakte hain.');
      return;
    }
  }

  await sendWhatsAppMessage(from, 'Samajh nahi aaya. "Hi" bhej kar naya order menu open karein.');
}
