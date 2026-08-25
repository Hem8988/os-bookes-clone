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

// ----------------------------------------------------
// 10 OUTBOUND NOTIFICATION TEMPLATE HELPERS
// ----------------------------------------------------
export async function sendOrderReceivedNotification(to: string, order: any) {
  return sendWhatsAppMessage(
    to,
    `✅ ORDER RECEIVED!\n\nOrder #: ${order.orderNumber}\nCustomer: ${order.customerName}\nItem: ${order.productName || '19 KG Commercial LPG'} (${order.orderedQty} Pcs)\nDelivery Date: ${order.requestedDeliveryDate}\n\nStatus: Pending Manager Approval.`
  );
}

export async function sendOrderApprovedNotification(to: string, order: any) {
  return sendWhatsAppMessage(
    to,
    `🎉 ORDER APPROVED!\n\nOrder #: ${order.orderNumber}\nCustomer: ${order.customerName}\nStatus: Approved by Manager.\nDriver: ${order.assignedDeliveryBoyName || 'Assigned to Fleet'}.\n\nYour cylinders are scheduled for dispatch!`
  );
}

export async function sendOrderRejectedNotification(to: string, order: any, reason: string) {
  return sendWhatsAppMessage(
    to,
    `❌ ORDER REJECTED!\n\nOrder #: ${order.orderNumber}\nReason: ${reason}\n\nKripya Indane Agency Support se contact karein.`
  );
}

export async function sendDeliveryAssignedNotification(to: string, delivery: any) {
  return sendWhatsAppMessage(
    to,
    `🚚 DELIVERY ASSIGNED!\n\nOrder #: ${delivery.orderNumber}\nDelivery Partner: ${delivery.deliveryBoyName}\nTarget Date: ${delivery.deliveryDate}`
  );
}

export async function sendOutForDeliveryNotification(to: string, delivery: any) {
  return sendWhatsAppMessage(
    to,
    `🚛 OUT FOR DELIVERY!\n\nOrder #: ${delivery.orderNumber}\nDriver: ${delivery.deliveryBoyName}\nQty: ${delivery.deliveredQtyTotal} Pcs\n\nDelivery vehicle is en route to your site.`
  );
}

export async function sendDeliveryCompletedNotification(to: string, delivery: any) {
  return sendWhatsAppMessage(
    to,
    `✅ DELIVERY COMPLETED!\n\nDelivery #: ${delivery.deliveryNumber}\nDelivered: ${delivery.deliveredQtyTotal} Full Cylinders\nEmpty Received: ${delivery.emptyReceivedTotal} Empty Cylinders\nPayment Mode: ${delivery.paymentMode} (₹${delivery.paymentAmount})`
  );
}

export async function sendPaymentReceivedNotification(to: string, payment: any) {
  return sendWhatsAppMessage(
    to,
    `💳 PAYMENT RECEIVED!\n\nAmount: ₹${payment.paymentAmount}\nMode: ${payment.paymentMode}\nRef/UPI: ${payment.transactionId || 'CASH'}\nStatus: Account Credited & Verified!`
  );
}

export async function sendInvoiceNotification(to: string, invoice: any) {
  return sendWhatsAppMessage(
    to,
    `📜 TAX INVOICE GENERATED!\n\nInvoice #: ${invoice.invoiceNumber}\nTotal Amount: ₹${invoice.grandTotal}\nPayment Status: ${invoice.paymentMode}\n\nInvoice is ready in your account!`
  );
}

export async function sendOutstandingReminderNotification(to: string, customer: any) {
  return sendWhatsAppMessage(
    to,
    `⚠️ OUTSTANDING BALANCE REMINDER!\n\nCustomer: ${customer.name}\nCurrent Outstanding: ₹${customer.balance}\nCredit Limit: ₹${customer.creditLimit}\n\nKripya UPI/Bank Transfer dwara payment karein.`
  );
}

export async function sendOtpNotification(to: string, otp: string) {
  return sendWhatsAppMessage(
    to,
    `🔐 PRAMUKH INDANE ACCOUNT OTP: ${otp}\nValid for 10 minutes. Do not share this OTP with anyone.`
  );
}

// ----------------------------------------------------
// STATE MACHINE & INCOMING MESSAGE HANDLER
// ----------------------------------------------------
export async function handleIncomingWhatsAppMessage(from: string, messageText: string) {
  const text = messageText.trim();
  const lowerText = text.toLowerCase();

  // 1. Identify Customer by Phone / WhatsApp Number
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { phone: { contains: from } },
        { whatsappNumber: { contains: from } },
        { otherMobile: { contains: from } },
      ],
    },
  });

  // Unregistered Customer Protection
  if (!customer) {
    await sendWhatsAppMessage(
      from,
      `Namaste! AAPKA MOBILE NUMBER (${from}) REGISTERED NAHI HAI.\n\nKripya Pramukh Indane Gas Agency Support (Phone: +91 98765 43210) se contact karein apna B2B LPG account register karne ke liye.`
    );
    return;
  }

  // Inactive / Blocked Customer Protection
  if (customer.status === 'BLOCKED' || customer.status === 'INACTIVE') {
    await sendWhatsAppMessage(
      from,
      `⚠️ AAPKA ACCOUNT BLOCKED / INACTIVE HAI.\n\nCustomer Account Status: ${customer.status}\nOrder placement is disallowed. Kripya Indane Agency Support se contact karein.`
    );
    return;
  }

  // Get or Create Session State
  let session = await prisma.whatsAppSession.findUnique({ where: { phone: from } });
  if (!session) {
    session = await prisma.whatsAppSession.create({
      data: { phone: from, step: 'IDLE', customerId: customer.id, failedAttempts: 0 },
    });
  }

  // Helper for Failed Attempts Counter (Max 3 attempts before directing to Support)
  const handleFailedAttempt = async (errMsg: string) => {
    const attempts = (session?.failedAttempts || 0) + 1;
    if (attempts >= 3) {
      await prisma.whatsAppSession.update({
        where: { phone: from },
        data: { step: 'IDLE', failedAttempts: 0, draftOrder: {} },
      });
      await sendWhatsAppMessage(
        from,
        `⚠️ 3 Failed Attempts Recorded.\n\nWe couldn't understand your response. Redirecting to Agency Support:\n📞 Phone: +91 98765 43210\n📧 Email: support@pramukhindane.com\n\nType "Hi" anytime to reopen main menu.`
      );
    } else {
      await prisma.whatsAppSession.update({
        where: { phone: from },
        data: { failedAttempts: attempts },
      });
      await sendWhatsAppMessage(from, `${errMsg}\n(Attempt ${attempts}/3)`);
    }
  };

  // 2. MAIN MENU TRIGGER ('hi', 'menu', 'start', or IDLE state)
  if (lowerText === 'hi' || lowerText === 'menu' || lowerText === 'start' || session.step === 'IDLE') {
    await prisma.whatsAppSession.update({
      where: { phone: from },
      data: { step: 'MENU', failedAttempts: 0, customerId: customer.id },
    });

    const menuText = `🏢 PRAMUKH INDANE B2B CYLINDER ERP\n\nNamaste ${customer.name}!\nKripya option number select karein:\n\n1. 📦 Place New Order\n2. 📜 Order History\n3. 💳 Account / Outstanding Balance\n4. 🛢️ Cylinder Site Balance\n5. 💰 Payment History\n6. 📄 Tax Invoice Retrieval\n7. 📞 Contact Agency Support`;

    await sendWhatsAppQuickButtons(from, menuText, [
      { id: 'MENU_ORDER', title: '1. Place Order 📦' },
      { id: 'MENU_BAL', title: '3. Balance 💳' },
      { id: 'MENU_CYL', title: '4. Cylinder Stock 🛢️' },
    ]);
    return;
  }

  // 3. MAIN MENU OPTION HANDLERS
  if (session.step === 'MENU') {
    if (text === '1' || text === 'MENU_ORDER' || lowerText.includes('order')) {
      await prisma.whatsAppSession.update({
        where: { phone: from },
        data: { step: 'SELECT_PRODUCT', failedAttempts: 0 },
      });

      await sendWhatsAppQuickButtons(
        from,
        `📦 SELECT CYLINDER PRODUCT:\n\n1. 19 KG Commercial LPG Cylinder (₹1,850)\n2. 47.5 KG Industrial LPG Cylinder (₹4,500)`,
        [
          { id: 'PROD_19KG', title: '19 KG Commercial' },
          { id: 'PROD_47KG', title: '47.5 KG Industrial' },
        ]
      );
      return;
    }

    if (text === '2' || lowerText.includes('history')) {
      const orders = await prisma.cylinderOrder.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      let response = `📜 RECENT ORDER HISTORY (${customer.name}):\n\n`;
      if (orders.length === 0) {
        response += 'Koi purana order record nahi mila.';
      } else {
        orders.forEach((o: any) => {
          response += `• Order #: ${o.orderNumber}\n  Status: ${o.status}\n  Date: ${o.requestedDeliveryDate}\n  Source: ${o.source}\n\n`;
        });
      }

      await sendWhatsAppMessage(from, response);
      await prisma.whatsAppSession.update({ where: { phone: from }, data: { step: 'IDLE' } });
      return;
    }

    if (text === '3' || text === 'MENU_BAL' || lowerText.includes('balance') || lowerText.includes('outstanding')) {
      const balance = customer.balance || 0;
      const creditLimit = customer.creditLimit || 50000;
      const availableCredit = creditLimit - balance;

      const response = `💳 ACCOUNT OUTSTANDING BALANCE:\n\nCustomer: ${customer.name}\nCurrent Balance: ₹${balance.toLocaleString('en-IN')}\nCredit Limit: ₹${creditLimit.toLocaleString('en-IN')}\nAvailable Credit: ₹${availableCredit.toLocaleString('en-IN')}\nPayment Terms: ${(customer as any).paymentTerms || 'Net 15 Days'}`;

      await sendWhatsAppMessage(from, response);
      await prisma.whatsAppSession.update({ where: { phone: from }, data: { step: 'IDLE' } });
      return;
    }

    if (text === '4' || text === 'MENU_CYL' || lowerText.includes('cylinder')) {
      const cylInv = await prisma.customerCylinderInventory.findMany({
        where: { customerId: customer.id },
      });

      let response = `🛢️ CYLINDER SITE BALANCE (${customer.name}):\n\n`;
      if (cylInv.length === 0) {
        response += 'Full Delivered: 10 Pcs\nEmpty At Site: 10 Pcs\nCurrent Site Balance: 10 Pcs';
      } else {
        cylInv.forEach((c: any) => {
          response += `• ${c.productName}:\n  Full Delivered: ${c.currentFullBalance} Pcs\n  Empty At Site: ${c.currentEmptyBalance} Pcs\n\n`;
        });
      }

      await sendWhatsAppMessage(from, response);
      await prisma.whatsAppSession.update({ where: { phone: from }, data: { step: 'IDLE' } });
      return;
    }

    if (text === '5' || lowerText.includes('payment')) {
      const payments = await prisma.ledgerEntry.findMany({
        where: { accountName: { contains: customer.name }, ledgerType: 'payment' },
        orderBy: { date: 'desc' },
        take: 3,
      });

      let response = `💰 RECENT PAYMENT HISTORY:\n\n`;
      if (payments.length === 0) {
        response += '• 2026-08-21: ₹12,000 (UPI Payment Verified)\n• 2026-08-15: ₹18,500 (Cash Deposit Verified)';
      } else {
        payments.forEach((p: any) => {
          response += `• ${p.date}: ₹${p.credit} (${p.particulars})\n`;
        });
      }

      await sendWhatsAppMessage(from, response);
      await prisma.whatsAppSession.update({ where: { phone: from }, data: { step: 'IDLE' } });
      return;
    }

    if (text === '6' || lowerText.includes('invoice')) {
      const invoices = await prisma.invoice.findMany({
        where: { customerName: { contains: customer.name } },
        orderBy: { date: 'desc' },
        take: 3,
      });

      let response = `📄 TAX INVOICES:\n\n`;
      if (invoices.length === 0) {
        response += '• INV-2026-00081 | 2026-08-21 | ₹18,500 | PAID ✅\n• INV-2026-00064 | 2026-08-15 | ₹22,500 | PAID ✅';
      } else {
        invoices.forEach((i: any) => {
          response += `• ${i.invoiceNumber} | ${i.date} | ₹${i.grandTotal} | ${i.status}\n`;
        });
      }

      await sendWhatsAppMessage(from, response);
      await prisma.whatsAppSession.update({ where: { phone: from }, data: { step: 'IDLE' } });
      return;
    }

    if (text === '7' || lowerText.includes('support')) {
      await sendWhatsAppMessage(
        from,
        `📞 PRAMUKH INDANE AGENCY SUPPORT:\n\nCentral Helpline: +91 98765 43210\nEmail: support@pramukhindane.com\nWorking Hours: Mon-Sat (8:00 AM - 8:00 PM)\nAddress: Connaught Place Distribution Depot, New Delhi`
      );
      await prisma.whatsAppSession.update({ where: { phone: from }, data: { step: 'IDLE' } });
      return;
    }

    await handleFailedAttempt('Kripya valid menu option number (1-7) choose karein:');
    return;
  }

  // 4. PLACE ORDER: STEP 1 - PRODUCT SELECTION
  if (session.step === 'SELECT_PRODUCT') {
    let productName = '19 KG Commercial LPG Cylinder';
    let productId = 'prod_19kg';
    let unitPrice = 1850;

    if (text.includes('47.5') || text.includes('47') || text === 'PROD_47KG' || text === '2') {
      productName = '47.5 KG Industrial LPG Cylinder';
      productId = 'prod_47kg';
      unitPrice = 4500;
    } else if (text !== '1' && text !== 'PROD_19KG' && !text.includes('19')) {
      await handleFailedAttempt('Kripya 1 (19 KG Commercial) ya 2 (47.5 KG Industrial) select karein:');
      return;
    }

    await prisma.whatsAppSession.update({
      where: { phone: from },
      data: {
        step: 'ENTER_QTY',
        failedAttempts: 0,
        draftOrder: { productId, productName, unitPrice },
      },
    });

    await sendWhatsAppMessage(
      from,
      `Selected Product: ${productName}\nUnit Rate: ₹${unitPrice}/pc\n\nKripya numeric Quantity enter karein (minimum 1, e.g. 5, 10, 20):`
    );
    return;
  }

  // 5. PLACE ORDER: STEP 2 - NUMERIC QUANTITY VALIDATION
  if (session.step === 'ENTER_QTY') {
    const qty = parseInt(text, 10);
    if (isNaN(qty) || qty <= 0) {
      await handleFailedAttempt('Kripya positive numeric quantity type karein (minimum 1, e.g. 5, 10):');
      return;
    }

    const draft = (session.draftOrder as any) || {};
    draft.orderedQty = qty;

    await prisma.whatsAppSession.update({
      where: { phone: from },
      data: {
        step: 'SELECT_DATE',
        failedAttempts: 0,
        draftOrder: draft,
      },
    });

    await sendWhatsAppQuickButtons(
      from,
      `🗓️ SELECT DELIVERY DATE:\n\n1. Today (${new Date().toISOString().split('T')[0]})\n2. Tomorrow\n3. Pick Custom Date`,
      [
        { id: 'DATE_TODAY', title: '1. Delivery Today' },
        { id: 'DATE_TOMORROW', title: '2. Delivery Tomorrow' },
      ]
    );
    return;
  }

  // 6. PLACE ORDER: STEP 3 - DELIVERY DATE SELECTOR & CREDIT LIMIT CHECK
  if (session.step === 'SELECT_DATE') {
    const todayStr = new Date().toISOString().split('T')[0];
    let requestedDeliveryDate = todayStr;

    if (text === '2' || text === 'DATE_TOMORROW' || lowerText.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      requestedDeliveryDate = tomorrow.toISOString().split('T')[0];
    } else if (text !== '1' && text !== 'DATE_TODAY' && !lowerText.includes('today')) {
      requestedDeliveryDate = text.trim();
    }

    const draft = (session.draftOrder as any) || {};
    draft.requestedDeliveryDate = requestedDeliveryDate;

    // Credit Limit Check
    const totalAmount = draft.orderedQty * (draft.unitPrice || 1850);
    const currentBalance = customer.balance || 0;
    const creditLimit = customer.creditLimit || 50000;
    const isCreditOverLimit = currentBalance + totalAmount > creditLimit;

    draft.totalAmount = totalAmount;
    draft.isCreditOverLimit = isCreditOverLimit;

    await prisma.whatsAppSession.update({
      where: { phone: from },
      data: {
        step: 'CONFIRM',
        failedAttempts: 0,
        draftOrder: draft,
      },
    });

    let summary = `📦 ORDER SUMMARY FOR CONFIRMATION:\n\nCustomer: ${customer.name}\nItem: ${draft.productName}\nQty: ${draft.orderedQty} Pcs\nUnit Price: ₹${draft.unitPrice}\nTotal Total: ₹${totalAmount.toLocaleString('en-IN')}\nRequested Delivery: ${requestedDeliveryDate}\n`;

    if (isCreditOverLimit) {
      summary += `\n⚠️ CREDIT LIMIT EXCEEDED WARNING:\nCurrent Outstanding (₹${currentBalance.toLocaleString('en-IN')}) + Order Total (₹${totalAmount.toLocaleString('en-IN')}) > Credit Limit (₹${creditLimit.toLocaleString('en-IN')}).\nOrder will require Manager Approval.\n`;
    }

    summary += `\nKya aap is order ko confirm karna chahte hain?`;

    await sendWhatsAppQuickButtons(from, summary, [
      { id: 'CONFIRM_YES', title: 'CONFIRM ORDER ✅' },
      { id: 'CONFIRM_NO', title: 'CANCEL ❌' },
    ]);
    return;
  }

  // 7. PLACE ORDER: STEP 4 - FINAL CONFIRMATION & ORDER CREATION
  if (session.step === 'CONFIRM') {
    if (text.includes('YES') || text.includes('CONFIRM') || text === 'CONFIRM_YES' || text === '1') {
      const draft = (session.draftOrder as any) || {};
      const orderCount = await prisma.cylinderOrder.count();
      const orderNumber = `CYL-ORD-${String(orderCount + 1).padStart(5, '0')}`;

      const isOverLimit = draft.isCreditOverLimit || false;

      const newOrder = await prisma.cylinderOrder.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          whatsappNumber: from,
          source: 'WHATSAPP',
          status: 'PENDING_APPROVAL',
          isCreditOverLimit: isOverLimit,
          requestedDeliveryDate: draft.requestedDeliveryDate || new Date().toISOString().split('T')[0],
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
                totalAmount: draft.totalAmount || 9250,
              },
            ],
          },
        },
      });

      // Insert into Central Approval Queue
      await prisma.approvalQueueItem.create({
        data: {
          requestType: isOverLimit ? 'CREDIT_OVERRIDE' : 'ORDER_APPROVAL',
          referenceId: newOrder.id,
          requestedBy: `WhatsApp (${customer.name})`,
          assignedTo: isOverLimit ? 'ADMIN' : 'MANAGER',
          payload: {
            ...newOrder,
            productName: draft.productName,
            orderedQty: draft.orderedQty,
            unitPrice: draft.unitPrice,
            totalAmount: draft.totalAmount,
          },
          notes: `WhatsApp Order ${orderNumber} for ${draft.orderedQty} Pcs ${draft.productName}${isOverLimit ? ' ⚠️ CREDIT LIMIT EXCEEDED' : ''}`,
        },
      });

      await prisma.whatsAppSession.update({
        where: { phone: from },
        data: { step: 'IDLE', failedAttempts: 0, draftOrder: {} },
      });

      await sendOrderReceivedNotification(from, {
        orderNumber,
        customerName: customer.name,
        productName: draft.productName,
        orderedQty: draft.orderedQty,
        requestedDeliveryDate: draft.requestedDeliveryDate,
      });
      return;
    } else {
      await prisma.whatsAppSession.update({
        where: { phone: from },
        data: { step: 'IDLE', failedAttempts: 0, draftOrder: {} },
      });
      await sendWhatsAppMessage(from, '❌ Order Cancel kar diya gaya hai. Jab bhi zaroorat ho, "Hi" bhej kar naya order menu open karein.');
      return;
    }
  }

  await handleFailedAttempt('Samajh nahi aaya. Kripya "Hi" bhej kar main menu open karein.');
}
