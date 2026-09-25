'use client';

import { useEffect, useState } from 'react';
import { MR, PATTERNS_MR, STATUS_MR } from './i18n.mr';

// English / Hindi interface for field users (SRS §17 Localization). The English
// text is the key, so an untranslated string simply shows in English.
// Placeholders like {n} are filled from t(text, { n }).

export type Lang = 'en' | 'hi' | 'mr';
export const LANGS: { code: Lang; label: string; locale: string }[] = [
  { code: 'en', label: 'EN', locale: 'en-IN' },
  { code: 'hi', label: 'हिं', locale: 'hi-IN' },
  { code: 'mr', label: 'मर', locale: 'mr-IN' },
];
const KEY = 'deskshark.lang';
const EVENT = 'deskshark:lang';

const HI: Record<string, string> = {
  // common
  Today: 'आज',
  Tomorrow: 'कल',
  Orders: 'ऑर्डर',
  Cash: 'कैश',
  Stock: 'स्टॉक',
  Online: 'ऑनलाइन',
  Offline: 'ऑफ़लाइन',
  Logout: 'लॉग आउट',
  Refresh: 'रिफ्रेश',
  Back: 'वापस',
  Send: 'भेजें',
  Submit: 'सबमिट करें',
  'Loading…': 'लोड हो रहा है…',
  'Select…': 'चुनें…',
  'None.': 'कुछ नहीं।',
  'None yet.': 'अभी कुछ नहीं।',
  Delivery: 'डिलीवरी',
  Notifications: 'सूचनाएँ',
  'Mark all read': 'सब पढ़ा हुआ करें',
  'Enable push': 'पुश चालू करें',
  'Enable desktop alerts': 'पॉप-अप अलर्ट चालू करें',
  'Sound on': 'आवाज़ चालू',
  'Sound off': 'आवाज़ बंद',
  'New delivery assigned': 'नई डिलीवरी मिली',
  'Delivery sent back for correction': 'डिलीवरी सुधार के लिए वापस आई',
  'Delivery sent back': 'डिलीवरी वापस आई',
  'No notifications.': 'कोई सूचना नहीं।',
  full: 'भरे',
  empty: 'खाली',
  Full: 'भरे',
  Empty: 'खाली',
  Product: 'सामान',
  Qty: 'संख्या',
  Type: 'प्रकार',
  Details: 'विवरण',
  Urgent: 'अर्जेंट',
  // login
  'Email or mobile': 'ईमेल या मोबाइल',
  Password: 'पासवर्ड',
  'Log in': 'लॉग इन',
  Verify: 'वेरिफाई करें',
  'Resend OTP': 'OTP दोबारा भेजें',
  Continue: 'आगे बढ़ें',
  '← Start again': '← फिर से शुरू करें',
  'Enter the OTP sent on WhatsApp': 'WhatsApp पर आया OTP डालें',
  'Set up fingerprint / face unlock for this phone.': 'इस फ़ोन के लिए फिंगरप्रिंट / फेस लॉक सेट करें।',
  'Confirm it is you with fingerprint / face.': 'फिंगरप्रिंट / फेस से पुष्टि करें।',
  'Location check… please allow location access.': 'लोकेशन जाँच… कृपया लोकेशन की अनुमति दें।',
  // delivery home
  'Day status': 'दिन की स्थिति',
  'On duty': 'ड्यूटी पर',
  'Day closed': 'दिन बंद',
  'Not started': 'शुरू नहीं हुआ',
  'Start day (location check)': 'दिन शुरू करें (लोकेशन जाँच)',
  'Close day': 'दिन बंद करें',
  'Close today': 'आज का दिन बंद करें',
  'Close & lock day': 'दिन बंद और लॉक करें',
  'Pending sync': 'सिंक बाकी',
  'Sync now': 'अभी सिंक करें',
  Deliveries: 'डिलीवरी',
  'Cylinders delivered': 'दिए गए सिलेंडर',
  'Cash in hand': 'हाथ में कैश',
  'Online / cheque': 'ऑनलाइन / चेक',
  'Stock with me': 'मेरे पास स्टॉक',
  'No stock issued yet.': 'अभी कोई स्टॉक नहीं मिला।',
  'No stock.': 'कोई स्टॉक नहीं।',
  'After closing, changes need admin approval.': 'दिन बंद होने के बाद बदलाव के लिए एडमिन की मंज़ूरी चाहिए।',
  '{n} awaiting accounts': '{n} अकाउंट्स की जाँच में',
  '{n} empties collected': '{n} खाली सिलेंडर लिए',
  '{amount} pending submission': '{amount} जमा करना बाकी',
  'Credit given {amount}': 'उधार दिया {amount}',
  '{n} delivery(s) sent back by accounts — open Orders to correct.': 'अकाउंट्स ने {n} डिलीवरी वापस भेजी है — ऑर्डर खोलकर सुधारें।',
  'Day started. Drive safe!': 'दिन शुरू हो गया। सावधानी से चलाएँ!',
  'Sync pending deliveries before closing the day.': 'दिन बंद करने से पहले बाकी डिलीवरी सिंक करें।',
  'Day closed. Entries are locked.': 'दिन बंद हो गया। एंट्री लॉक हो गईं।',
  'Submit your cash in hand ({amount}) before closing the day.': 'दिन बंद करने से पहले हाथ का कैश ({amount}) जमा करें।',
  'Go to Cash — submit now': 'कैश टैब खोलें — अभी जमा करें',
  'Super Admin': 'सुपर एडमिन',
  Manager: 'मैनेजर',
  Accountant: 'अकाउंटेंट',
  'Delivery Boy': 'डिलीवरी बॉय',
  Opening: 'शुरुआत',
  '+Recd': '+मिले',
  '−Deliv': '−दिए',
  '−Ret': '−लौटाए',
  Closing: 'अंत में',
  'Opening cash': 'शुरुआती कैश',
  '+ Cash collected': '+ मिला कैश',
  '− Submitted': '− जमा किया',
  'Closing cash (in hand)': 'अंत का कैश (हाथ में)',
  // orders
  'Start your day to deliver orders.': 'डिलीवरी के लिए पहले दिन शुरू करें।',
  'Sent back for correction': 'सुधार के लिए वापस भेजे गए',
  'To deliver': 'डिलीवर करने हैं',
  'Open orders': 'ऑर्डर देखें',
  'Waiting for accounts': 'अकाउंट्स की जाँच बाकी',
  'No orders assigned right now.': 'अभी कोई ऑर्डर नहीं है।',
  'My orders waiting for approval': 'मेरे ऑर्डर — मंज़ूरी बाकी',
  'Rejected by office': 'ऑफिस ने रद्द किया',
  'Reason: {reason}': 'कारण: {reason}',
  Customer: 'ग्राहक',
  'Search name, mobile or code': 'नाम, मोबाइल या कोड से खोजें',
  'No customer found.': 'कोई ग्राहक नहीं मिला।',
  Change: 'बदलें',
  'Product…': 'प्रोडक्ट…',
  'Add product': 'प्रोडक्ट जोड़ें',
  Priority: 'प्राथमिकता',
  Normal: 'सामान्य',
  'Note (optional)': 'नोट (वैकल्पिक)',
  'The office approves it, then it comes to your list to deliver.': 'ऑफिस मंज़ूरी देगा, फिर यह डिलीवरी के लिए आपकी लिस्ट में आ जाएगा।',
  'Order sent to the office for approval.': 'ऑर्डर मंज़ूरी के लिए ऑफिस भेज दिया।',
  Call: 'कॉल',
  Map: 'नक्शा',
  Order: 'ऑर्डर',
  Bill: 'बिल',
  'Customer history': 'ग्राहक का इतिहास',
  'Accept order': 'ऑर्डर स्वीकार करें',
  'Out for delivery': 'डिलीवरी के लिए निकले',
  'Enter delivery': 'डिलीवरी दर्ज करें',
  'Correct & resubmit': 'सुधारकर दोबारा भेजें',
  'Order accepted.': 'ऑर्डर स्वीकार हो गया।',
  'Customer notified: out for delivery.': 'ग्राहक को बता दिया: डिलीवरी रास्ते में है।',
  'Sent back by accounts: {reason}': 'अकाउंट्स ने वापस भेजा: {reason}',
  'Contact: {name} · {phone}': 'संपर्क: {name} · {phone}',
  'Previous dues': 'पिछला बकाया',
  'Cylinders with customer': 'ग्राहक के पास सिलेंडर',
  '{date}: {full} full / {empty} empty by {name}': '{date}: {full} भरे / {empty} खाली — {name}',
  'Start your day from the Today tab first — then the Enter delivery button appears here.': 'पहले "आज" टैब से दिन शुरू करें — फिर यहाँ "डिलीवरी दर्ज करें" बटन आएगा।',
  'Not enough full cylinders with you for this order:': 'इस ऑर्डर के लिए आपके पास भरे सिलेंडर कम हैं:',
  '{name}: need {need}, you have {have}': '{name}: चाहिए {need}, आपके पास {have}',
  'Take stock from the godown (Stock tab → Request stock) before entering the delivery.': 'डिलीवरी दर्ज करने से पहले गोदाम से स्टॉक लें (स्टॉक टैब → स्टॉक माँगें)।',
  'This delivery is saved on the phone and will sync automatically.': 'यह डिलीवरी फ़ोन में सेव है और अपने आप सिंक हो जाएगी।',
  // delivery form
  '(ordered {n})': '(ऑर्डर {n})',
  'Delivered (full)': 'दिए (भरे)',
  'Empty received': 'खाली लिए',
  'Difference will be flagged for accounts.': 'अंतर अकाउंट्स को दिखाया जाएगा।',
  'Amount collected (₹)': 'लिया गया पैसा (₹)',
  'Transaction ID / UTR': 'ट्रांज़ैक्शन ID / UTR',
  'Payment screenshot': 'पेमेंट स्क्रीनशॉट',
  'Cheque no.': 'चेक नंबर',
  'Cheque date': 'चेक तारीख',
  Bank: 'बैंक',
  'Cheque photo': 'चेक फोटो',
  'Delivery proof': 'डिलीवरी फोटो',
  Remarks: 'टिप्पणी',
  'e.g. gate 2, call before delivery': 'जैसे: गेट 2, आने से पहले कॉल करें',
  'Take photo': 'फोटो लें',
  'Submit delivery': 'डिलीवरी सबमिट करें',
  CASH: 'नकद',
  ONLINE: 'ऑनलाइन',
  CHEQUE: 'चेक',
  CREDIT: 'उधार',
  'Transaction ID and payment screenshot are required.': 'ट्रांज़ैक्शन ID और पेमेंट स्क्रीनशॉट ज़रूरी हैं।',
  'Cheque number, bank, date and photo are required.': 'चेक नंबर, बैंक, तारीख और फोटो ज़रूरी हैं।',
  'Delivery saved — syncing…': 'डिलीवरी सेव हो गई — सिंक हो रही है…',
  'Offline: delivery saved on phone (Pending Sync).': 'ऑफ़लाइन: डिलीवरी फ़ोन में सेव है (सिंक बाकी)।',
  // wallet & stock
  'Submit cash': 'कैश जमा करें',
  'Handing over to': 'किसे दे रहे हैं',
  'Amount (₹)': 'रकम (₹)',
  'Amount ₹': 'रकम ₹',
  'Proof photo (optional)': 'रसीद फोटो (वैकल्पिक)',
  'My submissions': 'मेरे जमा',
  'Wallet history': 'वॉलेट इतिहास',
  'Pending submission {pending} · can submit {available}': 'जमा बाकी {pending} · जमा कर सकते हैं {available}',
  'Cash submission sent for confirmation.': 'कैश जमा पुष्टि के लिए भेज दिया।',
  'Request stock': 'स्टॉक माँगें',
  'Return to godown': 'गोदाम में लौटाएँ',
  'Other request (advance, vehicle…)': 'अन्य अनुरोध (एडवांस, गाड़ी…)',
  'My stock requests': 'मेरे स्टॉक अनुरोध',
  'My requests': 'मेरे अनुरोध',
  Cylinder: 'सिलेंडर',
  Note: 'नोट',
  'My note': 'मेरा नोट',
  'Changed by {name}': '{name} ने बदला',
  'Approved by {name}': '{name} ने मंज़ूर किया',
  'Rejected by {name}': '{name} ने नामंज़ूर किया',
  'Request stock from godown': 'गोदाम से स्टॉक माँगें',
  'Return stock to godown': 'गोदाम में स्टॉक लौटाएँ',
  'Send for approval': 'मंज़ूरी के लिए भेजें',
  Godown: 'गोदाम',
  'Request to manager': 'मैनेजर से अनुरोध',
  'Extra cylinders': 'ज़्यादा सिलेंडर',
  'Cash advance': 'कैश एडवांस',
  'Vehicle issue': 'गाड़ी की समस्या',
  Other: 'अन्य',
  'Request sent for manager approval.': 'अनुरोध मैनेजर की मंज़ूरी के लिए भेज दिया।',
  'Request sent.': 'अनुरोध भेज दिया।',
  SALE: 'बिक्री',
  RECEIPT: 'कैश मिला',
  SUBMISSION: 'कैश जमा',
  REVERSAL: 'वापसी',
  OPENING: 'शुरुआती',
  // customer portal
  Outstanding: 'बकाया',
  'Credit limit': 'क्रेडिट लिमिट',
  complaints: 'शिकायत',
  Complaints: 'शिकायतें',
  'Raise complaint': 'शिकायत दर्ज करें',
  'No complaints.': 'कोई शिकायत नहीं।',
  'Complaint {n} registered. We will call you soon.': 'शिकायत {n} दर्ज हो गई। हम जल्द आपको कॉल करेंगे।',
  'In progress': 'काम चल रहा है',
  Open: 'खुली',
  Resolved: 'हल हो गई',
  'What happened': 'क्या हुआ',
  'Gas leak': 'गैस लीक',
  'Short weight': 'कम वज़न',
  'Late delivery': 'देर से डिलीवरी',
  'Damaged cylinder / valve': 'खराब सिलेंडर / वाल्व',
  Billing: 'बिल',
  'Staff behaviour': 'स्टाफ का व्यवहार',
  'Gas leak: close the regulator, open doors and windows, do not switch on lights. Call us right away.': 'गैस लीक: रेगुलेटर बंद करें, दरवाज़े-खिड़की खोलें, लाइट का स्विच न दबाएँ। तुरंत हमें कॉल करें।',
  'Pay now': 'अभी भुगतान करें',
  'New order': 'नया ऑर्डर',
  'Place order': 'ऑर्डर दें',
  'Delivery date': 'डिलीवरी तारीख',
  invoices: 'इनवॉइस',
  orders: 'ऑर्डर',
  payments: 'पेमेंट',
  statement: 'खाता विवरण',
  // messages from the server a delivery boy can see
  'Delivery proof photo is mandatory.': 'डिलीवरी की फोटो ज़रूरी है।',
  'Enter the amount collected.': 'लिया गया पैसा डालें।',
  'Enter the amount you are submitting.': 'जमा की जाने वाली रकम डालें।',
  'Enter delivered or empty cylinder quantity.': 'दिए गए या खाली सिलेंडर की संख्या डालें।',
  'Enter at least one quantity.': 'कम से कम एक संख्या डालें।',
  'Cheque number, bank and date are required.': 'चेक नंबर, बैंक और तारीख ज़रूरी हैं।',
  'Cheque photo is required.': 'चेक की फोटो ज़रूरी है।',
  'Choose a payment mode.': 'पेमेंट का तरीका चुनें।',
  'Choose a request type.': 'अनुरोध का प्रकार चुनें।',
  'Transaction ID is required for online payment.': 'ऑनलाइन पेमेंट के लिए ट्रांज़ैक्शन ID ज़रूरी है।',
  'Payment screenshot is required for online payment.': 'ऑनलाइन पेमेंट के लिए स्क्रीनशॉट ज़रूरी है।',
  'Payment amount cannot be negative.': 'पेमेंट की रकम माइनस नहीं हो सकती।',
  'Quantities must be whole numbers.': 'संख्या पूरी होनी चाहिए।',
  'Quantities in a stock movement cannot be negative.': 'स्टॉक की संख्या माइनस नहीं हो सकती।',
  'A product in the delivery is not part of this order.': 'डिलीवरी का एक सामान इस ऑर्डर में नहीं है।',
  'Delivery time cannot be in the future.': 'डिलीवरी का समय आगे का नहीं हो सकता।',
  'Invalid delivery time.': 'डिलीवरी का समय गलत है।',
  'Invalid location.': 'लोकेशन गलत है।',
  'Invalid proof photo.': 'फोटो सही नहीं है।',
  'Location is required for delivery. Please allow location access.': 'डिलीवरी के लिए लोकेशन ज़रूरी है। कृपया लोकेशन की अनुमति दें।',
  'Location is required to start the day. Please allow location access.': 'दिन शुरू करने के लिए लोकेशन ज़रूरी है। कृपया लोकेशन की अनुमति दें।',
  'Location permission is required to log in.': 'लॉग इन के लिए लोकेशन की अनुमति ज़रूरी है।',
  'Please start your day first.': 'पहले अपना दिन शुरू करें।',
  'You have not started your day.': 'आपने अभी दिन शुरू नहीं किया है।',
  'Day is already closed.': 'दिन पहले ही बंद हो चुका है।',
  'Today is already closed. Ask the admin to re-open it.': 'आज का दिन बंद हो चुका है। एडमिन से दोबारा खुलवाएँ।',
  'Your day is already closed. Ask the admin to re-open it for corrections.': 'आपका दिन बंद हो चुका है। सुधार के लिए एडमिन से दोबारा खुलवाएँ।',
  'Offline entries older than 48 hours cannot be synced — contact the office.': '48 घंटे से पुरानी ऑफ़लाइन एंट्री सिंक नहीं हो सकती — ऑफिस से बात करें।',
  'Only newly assigned orders can be accepted.': 'सिर्फ़ नए असाइन हुए ऑर्डर ही स्वीकार हो सकते हैं।',
  'Order is not ready to go out for delivery.': 'ऑर्डर अभी डिलीवरी के लिए तैयार नहीं है।',
  'This order is not assigned to you.': 'यह ऑर्डर आपको असाइन नहीं है।',
  'Order not found.': 'ऑर्डर नहीं मिला।',
  'Delivery not found.': 'डिलीवरी नहीं मिली।',
  'Customer not found.': 'ग्राहक नहीं मिला।',
  'Product not found.': 'सामान नहीं मिला।',
  'Warehouse not found.': 'गोदाम नहीं मिला।',
  'Select who is receiving the cash.': 'चुनें कि कैश किसे दे रहे हैं।',
  'You can only request transfers to or from yourself.': 'आप सिर्फ़ अपने लिए स्टॉक माँग या लौटा सकते हैं।',
  'Source and destination must be different.': 'कहाँ से और कहाँ तक अलग होने चाहिए।',
  'Too many requests. Please wait a minute and try again.': 'बहुत ज़्यादा कोशिश। एक मिनट रुककर फिर कोशिश करें।',
  'Something went wrong. Please try again.': 'कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।',
  'Wrong email/mobile or password.': 'ईमेल/मोबाइल या पासवर्ड गलत है।',
  'Wrong OTP.': 'OTP गलत है।',
  'OTP expired. Log in again to get a new one.': 'OTP की समय-सीमा खत्म। नया OTP के लिए फिर से लॉग इन करें।',
  'Too many wrong OTP attempts. Log in again.': 'बहुत बार गलत OTP। फिर से लॉग इन करें।',
  'OTP is required but no mobile number is registered. Contact the admin.': 'OTP ज़रूरी है पर मोबाइल नंबर दर्ज नहीं है। एडमिन से बात करें।',
  'This phone is waiting for admin approval.': 'यह फ़ोन एडमिन की मंज़ूरी का इंतज़ार कर रहा है।',
  'This phone has been blocked by the admin.': 'एडमिन ने यह फ़ोन ब्लॉक कर दिया है।',
  'New device detected. The admin has been asked to approve this phone — try again after approval.': 'नया फ़ोन मिला। एडमिन से मंज़ूरी माँगी गई है — मंज़ूरी के बाद फिर कोशिश करें।',
  'This device could not be identified. Please use the DeskShark delivery app.': 'यह डिवाइस पहचाना नहीं गया। कृपया DeskShark डिलीवरी ऐप इस्तेमाल करें।',
  'Your account is not active. Contact the administrator.': 'आपका अकाउंट चालू नहीं है। एडमिन से बात करें।',
  'Cash submission to confirm': 'कैश जमा की पुष्टि करें',
};

// Order / request statuses shown as badges.
const STATUS_HI: Record<string, string> = {
  ASSIGNED: 'असाइन',
  ACCEPTED: 'स्वीकार',
  OUT_FOR_DELIVERY: 'रास्ते में',
  DELIVERED: 'डिलीवर',
  PENDING_VERIFICATION: 'जाँच बाकी',
  SENT_BACK: 'वापस भेजा',
  VERIFIED: 'जाँच पूरी',
  INVOICED: 'बिल बना',
  LEDGER_POSTED: 'खाते में दर्ज',
  COMPLETED: 'पूरा',
  CANCELLED: 'रद्द',
  PENDING: 'बाकी',
  PENDING_APPROVAL: 'मंज़ूरी बाकी',
  APPROVED: 'मंज़ूर',
  REJECTED: 'नामंज़ूर',
  CONFIRMED: 'पुष्टि हुई',
};

// Approval types as they appear in "<label> approved / rejected" notifications.
const APPROVAL_HI: Record<string, string> = {
  'Cash Submission': 'कैश जमा',
  'Stock Transfer': 'स्टॉक ट्रांसफ़र',
  'New Device Login': 'नया फ़ोन लॉगिन',
  'Delivery Boy Request': 'आपका अनुरोध',
  'Day Reopen': 'दिन दोबारा खोलना',
  'Delivery Verification': 'डिलीवरी जाँच',
};

// Server messages and notifications that carry names or numbers.
const PATTERNS: [RegExp, string | ((...m: string[]) => string)][] = [
  [/^(.+) (approved|rejected)$/, (_, label, how) => `${APPROVAL_HI[label] ?? label} ${how === 'approved' ? 'मंज़ूर' : 'नामंज़ूर'}`],
  [/^(\d+) order\(s\): (.+)$/, '$1 ऑर्डर: $2'],
  [/^(.+) — new device( — (.+))?$/, (_, name, _n, note) => `${name} — नया फ़ोन${note ? ` — ${note}` : ''}`],
  [/^(\d+) delivery\(s\) synced\.$/, '$1 डिलीवरी सिंक हो गईं।'],
  [/^(\d+) entry\(s\) could not sync — see Pending Sync\.$/,'$1 एंट्री सिंक नहीं हुईं — "सिंक बाकी" देखें।'],
  [/^Not enough (full|empty)? ?(.+) at (.+)\. Available: (-?\d+) full \/ (-?\d+) empty\.$/, '$3 के पास $2 का स्टॉक कम है। उपलब्ध: $4 भरे / $5 खाली।'],
  [/^(.+) is closed and locked by accounts\. Ask the admin to re-open the day\.$/, '$1 का दिन अकाउंट्स ने बंद और लॉक कर दिया है। एडमिन से दोबारा खुलवाएँ।'],
  [/^(\d+) order\(s\) are still out for delivery\. Deliver them or tell the manager before closing\.$/, '$1 ऑर्डर अभी रास्ते में हैं। दिन बंद करने से पहले डिलीवर करें या मैनेजर को बताएँ।'],
  [/^You can submit at most (₹[\d,.]+) \(cash in hand minus pending submissions\)\.$/, 'आप ज़्यादा से ज़्यादा $1 जमा कर सकते हैं (हाथ का कैश में से बाकी जमा घटाकर)।'],
  [/^Too many wrong attempts\. Try again after (.+)\.$/, 'बहुत बार गलत कोशिश। $1 के बाद फिर कोशिश करें।'],
  [/^Order (\S+) is (.+)\.$/, 'ऑर्डर $1 अभी "$2" है।'],
  [/^Order is already (.+)\.$/, 'ऑर्डर पहले से "$1" है।'],
  [/^Cash collected on (\S+) \((.+)\)$/, '$1 पर कैश मिला ($2)'],
  [/^Reversal of (\S+) \((.+)\)$/, '$1 की वापसी ($2)'],
  [/^Handed to (.+) \((\S+)\)$/, '$1 को दिया ($2)'],
  [/^Submit your cash in hand \((₹[\d,.]+)\) from the Cash tab before closing the day\.$/, 'दिन बंद करने से पहले कैश टैब से हाथ का कैश ($1) जमा करें।'],
  [/^Received from (.+) \((\S+)\)$/, '$1 से मिला ($2)'],
  [/^(.+) submitted (₹[\d,.]+)$/, '$1 ने $2 जमा किए'],
];

const TABLES: Record<Exclude<Lang, 'en'>, { words: Record<string, string>; patterns: typeof PATTERNS; statuses: Record<string, string> }> = {
  hi: { words: HI, patterns: PATTERNS, statuses: STATUS_HI },
  mr: { words: MR, patterns: PATTERNS_MR, statuses: STATUS_MR },
};

function current(): Lang {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved === 'hi' || saved === 'mr' ? saved : 'en';
  } catch {
    return 'en';
  }
}

export function setLang(lang: Lang) {
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event(EVENT));
}

function translate(text: string, lang: Exclude<Lang, 'en'>): string {
  const { words, patterns } = TABLES[lang];
  const exact = words[text];
  if (exact) return exact;
  for (const [re, out] of patterns) if (re.test(text)) return typeof out === 'string' ? text.replace(re, out) : text.replace(re, out as (...m: string[]) => string);
  return text;
}

/** Returns t() / status() for the chosen language and the language itself. */
export function useT() {
  const [lang, setState] = useState<Lang>('en');
  useEffect(() => {
    const sync = () => setState(current());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const t = (text: string, vars?: Record<string, string | number>) => {
    let out = lang === 'en' ? text : translate(text, lang);
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
    return out;
  };
  const status = (value: string) => (lang === 'en' ? undefined : TABLES[lang].statuses[value]) ?? value.replace(/_/g, ' ');
  const locale = LANGS.find((l) => l.code === lang)!.locale;
  return { t, status, lang, locale };
}
