// Wording and links for rows in the notifications table.
// Kinds are created by database triggers and functions (see the
// 20261113120000_offers_notifications_moderation.sql migration).

export type NotificationKind =
  | 'new_offer'
  | 'offer_changed'
  | 'offer_accepted'
  | 'listing_sold'
  | 'backup_chosen'
  | 'deal_cancelled'
  | 'listing_relisted'
  | 'new_message'
  | 'report_reviewed'
  | 'warning_received'
  | 'account_banned'
  | 'account_unbanned'
  | 'listing_removed'
  | 'listing_expired';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  listing_id: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: { name: string } | null;
  listing: { title: string } | null;
};

export function notificationText(n: AppNotification): string {
  const who = n.actor?.name || 'Someone';
  // The title is hidden when the listing was sold to someone else or removed
  const item = n.listing?.title ? `"${n.listing.title}"` : 'a listing';

  switch (n.kind) {
    case 'new_offer':
      return `${who} made an offer on ${item}.`;
    case 'offer_changed':
      return `${who} changed their offer on ${item}.`;
    case 'offer_accepted':
      return `Your offer on ${item} was accepted. Chat with the seller to meet up.`;
    case 'listing_sold':
      return `${item} was sold to someone else.`;
    case 'backup_chosen':
      return `You're the backup buyer for ${item}. You'll get it if the sale falls through.`;
    case 'deal_cancelled':
      return `The seller called off your purchase of ${item}.`;
    case 'listing_relisted':
      return `${item} is back up for sale, and your offer is open again.`;
    case 'new_message':
      return `${who} sent you a message about ${item}.`;
    case 'report_reviewed':
      return 'A moderator reviewed your report. Thanks for helping keep GoodsMandi safe.';
    case 'warning_received':
      return 'You received a warning after a report was confirmed. Three warnings restrict your account.';
    case 'account_banned':
      return 'Your account has been restricted. Your listings are hidden.';
    case 'account_unbanned':
      return 'Your account restriction was lifted. Your listings are back up.';
    case 'listing_removed':
      return `A moderator took down ${item}.`;
    case 'listing_expired':
      return `${item} expired after 60 days without new offers. Open it to renew.`;
    default:
      return 'You have a new notification.';
  }
}

export function notificationHref(n: AppNotification): string {
  if (n.kind === 'new_message' && n.listing_id && n.actor_id) {
    return `/chat/${n.listing_id}/${n.actor_id}`;
  }
  if (n.listing_id) return `/listings/${n.listing_id}`;
  return '/profile';
}
