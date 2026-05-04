import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

export function PushPermissionPrompt() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();
  const publicKeyQuery = trpc.push.getPublicKey.useQuery();

  // Check current notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check if user is already subscribed
  useEffect(() => {
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (err) {
          console.error('Error checking push subscription:', err);
        }
      }
    };
    checkSubscription();
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Your browser does not support notifications.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToNotifications();
      } else if (result === 'denied') {
        toast.error('You denied notification permission. You can enable it in browser settings.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      toast.error('Failed to request notification permission.');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !publicKeyQuery.data) {
      return;
    }

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKeyQuery.data?.publicKey || ''),
      });

      // Send subscription to server
      await subscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      });

      setIsSubscribed(true);
      toast.success('Push notifications enabled. You will receive notifications for new jobs.');
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      toast.error('Failed to enable push notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await unsubscribeMutation.mutateAsync({ endpoint: subscription.endpoint });
        }
      }
      setIsSubscribed(false);
      toast.success('Push notifications disabled.');
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err);
      toast.error('Failed to disable push notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  // Only show for technicians
  if (user?.role !== 'technician' || permission === 'denied') {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {isSubscribed ? (
        <>
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">Notifications enabled</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleUnsubscribe}
            disabled={isLoading}
            className="ml-auto"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
          </Button>
        </>
      ) : permission === 'granted' ? (
        <>
          <BellOff className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Notifications disabled</span>
          <Button
            size="sm"
            variant="outline"
            onClick={subscribeToNotifications}
            disabled={isLoading || !publicKeyQuery.data?.publicKey}
            className="ml-auto"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Enable
          </Button>
        </>
      ) : (
        <>
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Get notified of new jobs</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRequestPermission}
            disabled={isLoading}
            className="ml-auto"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Enable
          </Button>
        </>
      )}
    </div>
  );
}

// Helper: Convert base64 string to Uint8Array
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as BufferSource;
}

// Helper: Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
