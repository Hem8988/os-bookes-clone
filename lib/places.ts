// Indian places: a starter list of cities for the city pickers, and the state
// a PIN code belongs to (from its first digits) for when the online lookup fails.

export const COMMON_CITIES = [
  'Agra', 'Ahmedabad', 'Ahmednagar', 'Ajmer', 'Akola', 'Aligarh', 'Allahabad (Prayagraj)', 'Amravati', 'Amritsar', 'Anand', 'Aurangabad (Chh. Sambhajinagar)', 'Bangalore (Bengaluru)', 'Bareilly', 'Baroda (Vadodara)', 'Belgaum (Belagavi)', 'Bhavnagar', 'Bhilai', 'Bhiwandi', 'Bhopal', 'Bhubaneswar', 'Bikaner', 'Bilaspur', 'Chakan', 'Chandigarh', 'Chennai', 'Coimbatore', 'Cuttack', 'Dehradun', 'Delhi', 'Dhanbad', 'Dhule', 'Durg', 'Faridabad', 'Ghaziabad', 'Goa (Panaji)', 'Gorakhpur', 'Gurgaon (Gurugram)', 'Guwahati', 'Gwalior', 'Hubli-Dharwad', 'Hyderabad', 'Indore', 'Jabalpur', 'Jaipur', 'Jalandhar', 'Jalgaon', 'Jammu', 'Jamnagar', 'Jamshedpur', 'Jodhpur', 'Kalyan-Dombivli', 'Kanpur', 'Kochi', 'Kolhapur', 'Kolkata', 'Kota', 'Kozhikode', 'Latur', 'Lonavala', 'Lucknow', 'Ludhiana', 'Madurai', 'Malegaon', 'Mangalore', 'Meerut', 'Mira-Bhayandar', 'Moradabad', 'Mumbai', 'Mysore (Mysuru)', 'Nagpur', 'Nanded', 'Nashik', 'Navi Mumbai', 'Noida', 'Panvel', 'Patna', 'Pimpri-Chinchwad', 'Pune', 'Raipur', 'Rajkot', 'Ranchi', 'Ratnagiri', 'Saharanpur', 'Salem', 'Sangli', 'Satara', 'Secunderabad', 'Shirdi', 'Solapur', 'Srinagar', 'Surat', 'Thane', 'Thiruvananthapuram', 'Tiruchirappalli', 'Udaipur', 'Ujjain', 'Ulhasnagar', 'Vapi', 'Varanasi', 'Vasai-Virar', 'Vijayawada', 'Visakhapatnam', 'Warangal',
];

/** GST state code for a PIN code, from its leading digits (used when the online lookup is unavailable). */
export function stateCodeFromPin(pin: string): string | null {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  const p3 = Number(pin.slice(0, 3));
  const p2 = Number(pin.slice(0, 2));
  const exact: [number, number, string][] = [
    [160, 160, '04'], [194, 194, '38'], [244, 249, '05'], [263, 263, '05'], [396, 396, '26'], [403, 403, '30'], [605, 605, '34'], [682, 682, '32'],
    [737, 737, '11'], [744, 744, '35'], [790, 792, '12'], [793, 794, '17'], [795, 795, '14'], [796, 796, '15'], [797, 798, '13'], [799, 799, '16'],
    [813, 835, '20'], [500, 509, '36'],
  ];
  for (const [a, b, code] of exact) if (p3 >= a && p3 <= b) return code;
  const ranges: [number, number, string][] = [
    [11, 11, '07'], [12, 13, '06'], [14, 16, '03'], [17, 17, '02'], [18, 19, '01'], [20, 28, '09'], [30, 34, '08'], [36, 39, '24'], [40, 44, '27'], [45, 48, '23'], [49, 49, '22'],
    [51, 53, '37'], [56, 59, '29'], [60, 64, '33'], [67, 69, '32'], [70, 74, '19'], [75, 77, '21'], [78, 78, '18'], [80, 85, '10'],
  ];
  for (const [a, b, code] of ranges) if (p2 >= a && p2 <= b) return code;
  return null;
}
