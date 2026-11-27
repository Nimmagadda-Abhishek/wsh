import { supabaseAdmin } from '../config/supabase.js';
import { notify } from './helpers.js';

// Returns null when the order belongs to another payment flow.
export async function fulfillEventTicketOrder(orderId, paymentId) {
  const { data: registration, error } = await supabaseAdmin.from('event_registrations')
    .select('id, user_id, event_id, status, ticket_code, razorpay_order_id')
    .eq('razorpay_order_id', orderId).maybeSingle();
  if (error) throw error;
  if (!registration) return null;
  if (['confirmed', 'payment_review'].includes(registration.status)) return registration;

  const { data, error: confirmError } = await supabaseAdmin.rpc('confirm_event_ticket', {
    p_registration_id: registration.id,
    p_order_id: orderId,
    p_payment_id: paymentId,
  });
  if (confirmError) throw confirmError;
  const confirmed = Array.isArray(data) ? data[0] : data;
  if (confirmed?.status === 'confirmed') {
    await notify(confirmed.user_id, 'Event ticket confirmed', `Your ticket ${confirmed.ticket_code} is confirmed.`, {
      eventId: confirmed.event_id, registrationId: confirmed.id,
    });
  } else if (confirmed?.status === 'payment_review') {
    await notify(confirmed.user_id, 'Event payment needs review', 'Your payment was received, but the event has reached capacity. Contact the organizer for a refund.', {
      eventId: confirmed.event_id, registrationId: confirmed.id,
    });
  }
  return confirmed;
}

export async function cancelFailedEventTicketOrder(orderId, paymentId) {
  const { data, error } = await supabaseAdmin.from('event_registrations')
    .update({ status: 'cancelled', razorpay_payment_id: paymentId || null, expires_at: null })
    .eq('razorpay_order_id', orderId).eq('status', 'pending').select('id').maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
