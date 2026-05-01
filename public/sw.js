const NOTIFICATION_ICON = '/next.svg';

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, chatId, type, tag } = data;

    const options = {
      body,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      tag: tag || chatId || 'default',
      renotify: true,
      data: { chatId, type, url: chatId ? `/chat/${chatId}` : '/chat' },
    };

    if (type === 'call') {
      options.tag = `call-${chatId}-${Date.now()}`;
      options.requireInteraction = true;
      options.urgency = 'high';
    }

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Push event error:', err);
  }
});

self.addEventListener('message', (event) => {
  if (!event.data || event.data.action !== 'showNotification') return;

  const { title, body, chatId, type, senderName, messageCount } = event.data;

  if (type === 'call') {
    self.registration.showNotification(title, {
      body,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      tag: `call-${chatId}-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      data: { chatId, type: 'call', url: chatId ? `/chat/${chatId}` : '/chat' },
    });
    return;
  }

  self.registration.getNotifications({ tag: chatId }).then((existing) => {
    let count = messageCount || 1;

    if (existing.length > 0) {
      const prev = existing[0];
      const prevCount = prev.data?.messageCount || 1;
      count = prevCount + 1;
      existing.forEach((n) => n.close());
    }

    const groupedBody = count > 1
      ? `${count} new messages`
      : body;

    self.registration.showNotification(title, {
      body: groupedBody,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      tag: chatId,
      renotify: true,
      data: { chatId, type: 'message', url: `/chat/${chatId}`, messageCount: count },
    });
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/chat') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
