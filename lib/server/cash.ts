import type { Tx } from '@/lib/db';
import { createApproval } from './approvals';
import { audit, Actor } from './audit';
import { assertDayOpen } from './dayLocks';
import type { Effects } from './effects';
import { badRequest, businessDate, conflict, notFound, round2 } from './http';
import { postBookEntry } from './ledger';
import { notifyUsers } from './notify';
import { nextNumber } from './sequence';
import { isStoredFile } from './storage';
import { availableToSubmit, COMPANY_WALLET, getWallet, postWallet } from './wallet';

/** Delivery boy hands over cash: Submit → Receiver → Amount → Proof → Approval (SRS §9.5). */
export async function submitCash(tx: Tx, actor: Actor, input: { amount: number; receiverId: string; proofUrl?: string | null }, effects: Effects) {
  const amount = round2(Number(input.amount));
  if (!(amount > 0)) throw badRequest('Enter the amount you are submitting.');
  if (input.proofUrl && !isStoredFile(input.proofUrl)) throw badRequest('Invalid proof photo.');
  const date = businessDate();
  await assertDayOpen(tx, actor.tenantId, date);

  const receiver = await tx.user.findFirst({ where: { id: input.receiverId, tenantId: actor.tenantId, role: { in: ['ACCOUNTANT', 'SUPER_ADMIN'] }, status: 'ACTIVE' } });
  if (!receiver) throw badRequest('Select who is receiving the cash.');

  const { available } = await availableToSubmit(tx, actor.tenantId, actor.userId, actor.name);
  if (amount > available + 0.001) throw badRequest(`You can submit at most ₹${available.toLocaleString('en-IN')} (cash in hand minus pending submissions).`);

  const submission = await tx.cashSubmission.create({
    data: {
      tenantId: actor.tenantId,
      submissionNumber: await nextNumber(tx, actor.tenantId, 'CS'),
      deliveryBoyId: actor.userId,
      deliveryBoyName: actor.name,
      receiverId: receiver.id,
      receiverName: receiver.name,
      amount,
      proofUrl: input.proofUrl || null,
      date,
    },
  });
  await createApproval(
    tx,
    {
      tenantId: actor.tenantId,
      type: 'CASH_SUBMISSION',
      referenceType: 'CASH_SUBMISSION',
      referenceId: submission.id,
      title: `${submission.submissionNumber} · ${actor.name} → ${receiver.name}`,
      summary: `₹${amount.toLocaleString('en-IN')} cash handed over on ${date}`,
      payload: { amount, receiverId: receiver.id },
      requestedById: actor.userId,
      requestedByName: actor.name,
    },
    effects
  );
  effects.add('notify receiver', () => notifyUsers(actor.tenantId, [receiver.id], { title: 'Cash submission to confirm', body: `${actor.name} submitted ₹${amount.toLocaleString('en-IN')}`, link: '/accountant' }));
  return submission;
}

export async function approveCash(tx: Tx, actor: Actor, submissionId: string) {
  const submission = await tx.cashSubmission.findFirst({ where: { id: submissionId, tenantId: actor.tenantId } });
  if (!submission) throw notFound('Cash submission not found.');
  if (submission.status !== 'PENDING') throw conflict('Cash submission is already processed.');
  await assertDayOpen(tx, actor.tenantId, submission.date);

  const boyWallet = await getWallet(tx, actor.tenantId, 'DELIVERY_BOY', submission.deliveryBoyId, submission.deliveryBoyName);
  if (boyWallet.balance + 0.001 < submission.amount) throw conflict(`${submission.deliveryBoyName}'s wallet has only ₹${boyWallet.balance}.`);
  const companyWallet = await getWallet(tx, actor.tenantId, 'COMPANY', COMPANY_WALLET.ownerId, COMPANY_WALLET.ownerName);

  const common = { referenceType: 'CASH_SUBMISSION', referenceId: submission.id, performedBy: actor.name };
  await postWallet(tx, boyWallet.id, { ...common, type: 'SUBMISSION', amount: -submission.amount, notes: `Handed to ${submission.receiverName} (${submission.submissionNumber})` });
  await postWallet(tx, companyWallet.id, { ...common, type: 'RECEIPT', amount: submission.amount, notes: `From ${submission.deliveryBoyName} (${submission.submissionNumber})` });
  await postBookEntry(tx, {
    tenantId: actor.tenantId,
    ledgerType: 'CASH',
    accountName: 'Company Cash',
    entryType: 'CASH_SUBMISSION',
    debit: submission.amount,
    voucherNumber: submission.submissionNumber,
    date: submission.date,
    particulars: `Cash deposit from ${submission.deliveryBoyName} received by ${submission.receiverName}`,
    referenceType: 'CASH_SUBMISSION',
    referenceId: submission.id,
    createdBy: actor.name,
  });
  await tx.cashSubmission.update({ where: { id: submission.id }, data: { status: 'APPROVED', verifiedBy: actor.name, verifiedAt: new Date() } });
  await audit(tx, actor, { action: 'CASH_SUBMISSION_APPROVED', entityType: 'CashSubmission', entityId: submission.id, reference: submission.submissionNumber, newValue: { amount: submission.amount } });
}

export async function rejectCash(tx: Tx, actor: Actor, submissionId: string, reason: string) {
  const submission = await tx.cashSubmission.findFirst({ where: { id: submissionId, tenantId: actor.tenantId } });
  if (!submission) throw notFound('Cash submission not found.');
  if (submission.status !== 'PENDING') throw conflict('Cash submission is already processed.');
  await tx.cashSubmission.update({ where: { id: submission.id }, data: { status: 'REJECTED', rejectionReason: reason, verifiedBy: actor.name, verifiedAt: new Date() } });
  await audit(tx, actor, { action: 'CASH_SUBMISSION_REJECTED', entityType: 'CashSubmission', entityId: submission.id, reference: submission.submissionNumber, reason });
}
