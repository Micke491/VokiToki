const NOTIFICATION_ICON = '/next.svg';

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, chatId, type, tag, icon, badge } = data;

    const options = {
      body,
      tag: tag || chatId || 'default',
      renotify: true,
      data: { chatId, type, url: chatId ? `/chat/${chatId}` : '/chat' },
    };

    if (icon) options.icon = icon;
    if (badge) options.badge = badge;

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

  const { title, body, chatId, type, senderName, messageCount, icon, badge } = event.data;

  if (type === 'call') {
    const options = {
      body,
      tag: `call-${chatId}-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      data: { chatId, type: 'call', url: chatId ? `/chat/${chatId}` : '/chat' },
    };

    if (icon) options.icon = icon;
    if (badge) options.badge = badge;

    self.registration.showNotification(title, options);
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

    const options = {
      body: groupedBody,
      tag: chatId,
      renotify: true,
      data: { chatId, type: 'message', url: `/chat/${chatId}`, messageCount: count },
    };

    if (icon) options.icon = icon;
    if (badge) options.badge = badge;

    self.registration.showNotification(title, options);
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
