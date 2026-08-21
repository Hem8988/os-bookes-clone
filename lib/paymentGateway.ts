export function generateUpiQrCode(upiId: string, name: string, amount: number, transactionRef: string) {
  const encodedName = encodeURIComponent(name);
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount}&cu=INR&tr=${transactionRef}&tn=Cylinder+Bill+${transactionRef}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`;
  
  return {
    upiUrl,
    qrImageUrl,
    amount,
    upiId,
  };
}
