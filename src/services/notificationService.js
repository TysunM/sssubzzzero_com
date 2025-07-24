import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  async initialize() {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        throw new Error('Permission not granted for push notifications');
      }

      // Get push token
      if (Device.isDevice) {
        const token = await Notifications.getExpoPushTokenAsync();
        this.expoPushToken = token.data;
        
        // Store token securely
        await SecureStore.setItemAsync('expoPushToken', this.expoPushToken);
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'SubZero Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
        });

        // Create specific channels for different types
        await Notifications.setNotificationChannelAsync('bill-reminders', {
          name: 'Bill Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#F59E0B',
        });

        await Notifications.setNotificationChannelAsync('spending-alerts', {
          name: 'Spending Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#EF4444',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      throw error;
    }
  }

  async scheduleBillReminder(subscription, daysBeforeBilling = 3) {
    try {
      const billingDate = new Date(subscription.nextBillingDate);
      const reminderDate = new Date(billingDate);
      reminderDate.setDate(billingDate.getDate() - daysBeforeBilling);

      // Don't schedule if the reminder date is in the past
      if (reminderDate <= new Date()) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💳 Upcoming Bill Reminder',
          body: `${subscription.name} will charge $${subscription.monthlyAmount} in ${daysBeforeBilling} days`,
          data: {
            type: 'bill_reminder',
            subscriptionId: subscription.id,
            subscriptionName: subscription.name,
            amount: subscription.monthlyAmount,
            daysUntil: daysBeforeBilling,
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: reminderDate,
        },
        identifier: `bill_reminder_${subscription.id}_${daysBeforeBilling}`,
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule bill reminder:', error);
      throw error;
    }
  }

  async scheduleSpendingAlert(monthlyLimit, currentSpending) {
    try {
      const percentageUsed = (currentSpending / monthlyLimit) * 100;
      
      // Only send alert if spending is over 80% of limit
      if (percentageUsed < 80) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Spending Alert',
          body: `You've spent $${currentSpending.toFixed(2)} (${percentageUsed.toFixed(0)}%) of your $${monthlyLimit} monthly budget`,
          data: {
            type: 'spending_alert',
            currentSpending,
            monthlyLimit,
            percentageUsed,
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
        identifier: `spending_alert_${Date.now()}`,
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule spending alert:', error);
      throw error;
    }
  }

  async scheduleDiscoveryReminder() {
    try {
      // Schedule a reminder to run discovery every 30 days
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 30);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔍 Time to Check for New Subscriptions',
          body: 'Run a discovery scan to find any new subscriptions you might have missed',
          data: {
            type: 'discovery_reminder',
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: {
          date: reminderDate,
        },
        identifier: `discovery_reminder_${Date.now()}`,
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule discovery reminder:', error);
      throw error;
    }
  }

  async sendImmediateNotification(title, body, data = {}) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to send immediate notification:', error);
      throw error;
    }
  }

  async cancelNotification(identifier) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllBillReminders(subscriptionId) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      const billReminderIds = scheduledNotifications
        .filter(notification => 
          notification.identifier.startsWith(`bill_reminder_${subscriptionId}_`)
        )
        .map(notification => notification.identifier);

      for (const id of billReminderIds) {
        await this.cancelNotification(id);
      }
    } catch (error) {
      console.error('Failed to cancel bill reminders:', error);
    }
  }

  async setupBillRemindersForSubscription(subscription, reminderDays = [7, 3, 1]) {
    try {
      // Cancel existing reminders for this subscription
      await this.cancelAllBillReminders(subscription.id);

      // Schedule new reminders
      const notificationIds = [];
      for (const days of reminderDays) {
        const id = await this.scheduleBillReminder(subscription, days);
        if (id) {
          notificationIds.push(id);
        }
      }

      return notificationIds;
    } catch (error) {
      console.error('Failed to setup bill reminders:', error);
      throw error;
    }
  }

  async setupAllBillReminders(subscriptions, userTier = 'free') {
    try {
      // Only paid users get bill reminders
      if (userTier === 'free') {
        return [];
      }

      const allNotificationIds = [];
      
      for (const subscription of subscriptions) {
        if (subscription.status === 'active') {
          const ids = await this.setupBillRemindersForSubscription(subscription);
          allNotificationIds.push(...ids);
        }
      }

      return allNotificationIds;
    } catch (error) {
      console.error('Failed to setup all bill reminders:', error);
      throw error;
    }
  }

  async checkSpendingLimits(subscriptions, monthlyLimit, userTier = 'free') {
    try {
      // Only paid users get spending alerts
      if (userTier === 'free') {
        return null;
      }

      const totalMonthlySpending = subscriptions
        .filter(sub => sub.status === 'active')
        .reduce((total, sub) => total + sub.monthlyAmount, 0);

      if (monthlyLimit && totalMonthlySpending > monthlyLimit * 0.8) {
        return await this.scheduleSpendingAlert(monthlyLimit, totalMonthlySpending);
      }

      return null;
    } catch (error) {
      console.error('Failed to check spending limits:', error);
      throw error;
    }
  }

  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  async clearAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  }

  // Notification listeners
  addNotificationReceivedListener(listener) {
    this.notificationListener = Notifications.addNotificationReceivedListener(listener);
    return this.notificationListener;
  }

  addNotificationResponseReceivedListener(listener) {
    this.responseListener = Notifications.addNotificationResponseReceivedListener(listener);
    return this.responseListener;
  }

  removeNotificationListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  // Get notification statistics
  async getNotificationStats() {
    try {
      const scheduled = await this.getScheduledNotifications();
      
      const billReminders = scheduled.filter(n => 
        n.content.data?.type === 'bill_reminder'
      ).length;
      
      const spendingAlerts = scheduled.filter(n => 
        n.content.data?.type === 'spending_alert'
      ).length;
      
      const discoveryReminders = scheduled.filter(n => 
        n.content.data?.type === 'discovery_reminder'
      ).length;

      return {
        total: scheduled.length,
        billReminders,
        spendingAlerts,
        discoveryReminders,
        pushToken: this.expoPushToken,
      };
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return {
        total: 0,
        billReminders: 0,
        spendingAlerts: 0,
        discoveryReminders: 0,
        pushToken: null,
      };
    }
  }
}

export const notificationService = new NotificationService();

