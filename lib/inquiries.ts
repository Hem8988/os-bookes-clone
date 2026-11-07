// Website inquiry form: shared by the public form, the API and the admin screen.

export const INQUIRY_NEEDS: Record<string, string> = {
  NEW_CONNECTION: 'New connection',
  REGULAR_SUPPLY: 'Regular monthly supply',
  URGENT_REFILL: 'Urgent refill',
  BULK: 'Bulk / industrial',
  OTHER: 'Other',
};

export const INQUIRY_STATUSES = ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
